import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CustomerLicense = {
  expires_at: string | null;
  revoked: boolean;
};

function isExpired(expiresAt: string | null) {
  return !!expiresAt && new Date(expiresAt) < new Date();
}

function chooseLicense(rows: CustomerLicense[]) {
  return rows.find((row) => !row.revoked && !isExpired(row.expires_at)) ?? rows[0];
}

async function handle(key: string, hwid: string, product: string) {
  if (!key || !hwid || !product) {
    return new Response("missing_params", { status: 400 });
  }

  // License check (same logic as verify)
  let cust: (CustomerLicense & { created_at: string })[] | null = null;
  try {
    const result = await supabaseAdmin
      .from("customers")
      .select("expires_at, revoked, created_at")
      .eq("hwid", hwid)
      .eq("product", product)
      .order("created_at", { ascending: false })
      .limit(10);

    if (result.error) {
      console.error("[asset] customers lookup failed", { key, hwid, product, error: result.error });
      return new Response("server_error", { status: 500 });
    }
    cust = result.data;
  } catch (error) {
    console.error("[asset] customers lookup threw", { key, hwid, product, error });
    return new Response("server_error", { status: 500 });
  }
  if (!cust?.length) return new Response("not_found", { status: 403 });
  const license = chooseLicense(cust);
  if (license.revoked) return new Response("revoked", { status: 403 });
  if (isExpired(license.expires_at)) {
    return new Response("expired", { status: 403 });
  }

  // Look up the asset
  const { data: asset } = await supabaseAdmin
    .from("assets")
    .select("file_path, product, filename")
    .eq("key", key)
    .maybeSingle();

  if (!asset || !asset.file_path) {
    return new Response("asset_not_found", { status: 404 });
  }
  // Asset must match the product the customer is licensed for
  if (asset.product !== product) {
    return new Response("product_mismatch", { status: 403 });
  }

  // Issue a short-lived signed URL and redirect. This handles large files
  // (hundreds of MB) that would exceed the worker's memory if streamed.
  const filename = asset.filename || asset.file_path.split("/").pop() || "asset";
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("assets")
    .createSignedUrl(asset.file_path, 300, { download: filename });
  if (signErr || !signed?.signedUrl) {
    return new Response("sign_failed", { status: 500 });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: signed.signedUrl,
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/asset")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return handle(
          url.searchParams.get("key") ?? "",
          url.searchParams.get("hwid") ?? "",
          url.searchParams.get("product") ?? "",
        );
      },
    },
  },
});
