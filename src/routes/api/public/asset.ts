import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function handle(key: string, hwid: string, product: string) {
  if (!key || !hwid || !product) {
    return new Response("missing_params", { status: 400 });
  }

  // License check (same logic as verify)
  const { data: cust, error } = await supabaseAdmin
    .from("customers")
    .select("expires_at, revoked")
    .eq("hwid", hwid)
    .eq("product", product)
    .maybeSingle();

  if (error) return new Response("server_error", { status: 500 });
  if (!cust) return new Response("not_found", { status: 403 });
  if (cust.revoked) return new Response("revoked", { status: 403 });
  if (cust.expires_at && new Date(cust.expires_at) < new Date()) {
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

  // Stream the file from the private bucket
  const { data: blob, error: dlErr } = await supabaseAdmin.storage
    .from("assets")
    .download(asset.file_path);
  if (dlErr || !blob) return new Response("download_failed", { status: 500 });

  const filename = asset.filename || asset.file_path.split("/").pop() || "asset";
  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
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