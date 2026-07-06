import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user-client";

export default defineTool({
  name: "revoke_customer",
  title: "Revoke customer license",
  description:
    "Revoke (or un-revoke) a customer license by row id. Requires admin sign-in.",
  inputSchema: {
    id: z.string().uuid().describe("Customer row UUID."),
    revoked: z.boolean().optional().describe("Defaults to true (revoke)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id, revoked }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("customers")
      .update({ revoked: revoked ?? true })
      .eq("id", id)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { customer: data },
    };
  },
});