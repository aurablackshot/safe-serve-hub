import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase-user-client";

export default defineTool({
  name: "list_app_versions",
  title: "List app versions",
  description: "List the current published version and download URL for each product.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("app_versions")
      .select("product, version, file_url, updated_at")
      .order("product", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { versions: data ?? [] },
    };
  },
});