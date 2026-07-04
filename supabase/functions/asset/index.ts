// Supabase Edge Function: signed asset download.
// Public endpoint (verify_jwt disabled). Mirrors /api/public/asset.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type CustomerLicense = { expires_at: string | null; revoked: boolean };

function isExpired(expiresAt: string | null) {
  return !!expiresAt && new Date(expiresAt) < new Date();
}
function chooseLicense(rows: CustomerLicense[]) {
  return rows.find((r) => !r.revoked && !isExpired(r.expires_at)) ?? rows[0];
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function handle(key: string, hwid: string, product: string) {
  if (!key || !hwid || !product) {
    return new Response("missing_params", { status: 400, headers: CORS });
  }

  const { data: cust, error } = await supabase
    .from("customers")
    .select("expires_at, revoked, created_at")
    .eq("hwid", hwid)
    .eq("product", product)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[asset] customers lookup failed", error);
    return new Response("server_error", { status: 500, headers: CORS });
  }
  if (!cust?.length) return new Response("not_found", { status: 403, headers: CORS });
  const license = chooseLicense(cust as CustomerLicense[]);
  if (license.revoked) return new Response("revoked", { status: 403, headers: CORS });
  if (isExpired(license.expires_at)) {
    return new Response("expired", { status: 403, headers: CORS });
  }

  const { data: asset } = await supabase
    .from("assets")
    .select("file_path, product, filename")
    .eq("key", key)
    .maybeSingle();

  if (!asset || !asset.file_path) {
    return new Response("asset_not_found", { status: 404, headers: CORS });
  }
  if (asset.product !== product) {
    return new Response("product_mismatch", { status: 403, headers: CORS });
  }

  const filename = asset.filename || asset.file_path.split("/").pop() || "asset";
  const { data: signed, error: signErr } = await supabase.storage
    .from("assets")
    .createSignedUrl(asset.file_path, 300, { download: filename });
  if (signErr || !signed?.signedUrl) {
    return new Response("sign_failed", { status: 500, headers: CORS });
  }
  return new Response(null, {
    status: 302,
    headers: {
      ...CORS,
      Location: signed.signedUrl,
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") {
    return new Response("method_not_allowed", { status: 405, headers: CORS });
  }
  const url = new URL(req.url);
  return handle(
    url.searchParams.get("key") ?? "",
    url.searchParams.get("hwid") ?? "",
    url.searchParams.get("product") ?? "",
  );
});
