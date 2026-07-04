import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/admin/publish-version")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const product = formData.get("product") as string;
          const version = formData.get("version") as string;
          const file = formData.get("file") as File | null;
          const fileUrl = formData.get("file_url") as string | null;
          const filePath = formData.get("file_path") as string | null;
          const updatedBy = formData.get("updated_by") as string | null;

          if (!product || !version) {
            return new Response(
              JSON.stringify({ error: "Product and version are required." }),
              { status: 400, headers: CORS }
            );
          }

          let uploadUrl = fileUrl;
          let uploadPath = filePath;

          if (file) {
            const ext = (file as any).name?.split(".").pop() || "bin";
            uploadPath = `${product.replace(/\s+/g, "_")}/${Date.now()}.${ext}`;
            const buffer = await (file as any).arrayBuffer();

            const { error: uploadError } = await supabaseAdmin.storage
              .from("releases")
              .upload(uploadPath, buffer, {
                contentType: (file as any).type || "application/octet-stream",
                upsert: true,
              });

            if (uploadError) {
              return new Response(
                JSON.stringify({ error: uploadError.message }),
                { status: 500, headers: CORS }
              );
            }

            const { data: publicUrl } = supabaseAdmin.storage
              .from("releases")
              .getPublicUrl(uploadPath);

            uploadUrl = publicUrl.publicUrl;
          }

          const payload: Record<string, any> = {
            product,
            version,
            updated_by: updatedBy,
            updated_at: new Date().toISOString(),
          };

          if (uploadUrl !== null) payload.file_url = uploadUrl;
          if (uploadPath !== null) payload.file_path = uploadPath;

          const { error: versionError } = await supabaseAdmin
            .from("app_versions")
            .upsert(payload, { onConflict: "product" });

          if (versionError) {
            return new Response(
              JSON.stringify({ error: versionError.message }),
              { status: 500, headers: CORS }
            );
          }

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: CORS,
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Publish failed" }),
            { status: 500, headers: CORS }
          );
        }
      },
    },
  },
});
