import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/admin/upload-file")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;
          const bucket = (formData.get("bucket") as string) || "releases";

          if (!file) {
            return new Response(
              JSON.stringify({ error: "No file provided" }),
              { status: 400, headers: CORS }
            );
          }

          // Convert File to Buffer
          const buffer = await file.arrayBuffer();

          // Upload to Supabase storage (admin bypass)
          const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(`${Date.now()}-${file.name}`, buffer, {
              contentType: file.type,
              upsert: false,
            });

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: CORS }
            );
          }

          // Get public URL
          const { data: publicUrl } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(data.path);

          return new Response(
            JSON.stringify({
              success: true,
              path: data.path,
              url: publicUrl.publicUrl,
            }),
            { status: 200, headers: CORS }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "Upload failed" }),
            { status: 500, headers: CORS }
          );
        }
      },
    },
  },
});
