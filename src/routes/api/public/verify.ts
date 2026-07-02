import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Hand-built JSON — guarantees no whitespace between keys/values so
// simple substring checks like InStr(body, `"valid":true`) always match.
function jsonEscape(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
function kv(key: string, value: string | number | boolean | null) {
  if (value === null) return `"${key}":null`;
  if (typeof value === "boolean" || typeof value === "number") return `"${key}":${value}`;
  return `"${key}":"${jsonEscape(value)}"`;
}
function build(obj: Record<string, string | number | boolean | null>) {
  return "{" + Object.entries(obj).map(([k, v]) => kv(k, v)).join(",") + "}";
}

async function verify(hwid: string, product: string) {
  if (!hwid || !product) {
    return new Response(
      build({ valid: false, reason: "missing_params" }),
      { status: 400, headers: CORS },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("name, product, expires_at, revoked")
    .eq("hwid", hwid)
    .eq("product", product)
    .maybeSingle();

  if (error) {
    return new Response(
      build({ valid: false, reason: "server_error" }),
      { status: 500, headers: CORS },
    );
  }
  if (!data) {
    return new Response(
      build({ valid: false, reason: "not_found" }),
      { status: 200, headers: CORS },
    );
  }
  if (data.revoked) {
    return new Response(
      build({ valid: false, reason: "revoked" }),
      { status: 200, headers: CORS },
    );
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new Response(
      build({ valid: false, reason: "expired", expires_at: data.expires_at }),
      { status: 200, headers: CORS },
    );
  }

  const { data: ver } = await supabaseAdmin
    .from("app_versions")
    .select("version, file_url")
    .eq("product", product)
    .maybeSingle();

  return new Response(
    build({
      valid: true,
      hwid: hwid,
      name: data.name,
      product: data.product,
      expires_at: data.expires_at ?? null,
      latest_version: ver?.version ?? null,
      download_url: ver?.file_url ?? null,
    }),
    { status: 200, headers: CORS },
  );
}

export const Route = createFileRoute("/api/public/verify")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return verify(
          url.searchParams.get("hwid") ?? "",
          url.searchParams.get("product") ?? "",
        );
      },
      POST: async ({ request }) => {
        let body: { hwid?: string; product?: string } = {};
        try {
          body = await request.json();
        } catch {
          // ignore
        }
        return verify(body.hwid ?? "", body.product ?? "");
      },
    },
  },
});