import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user-client";

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description:
    "List customer licenses. Optionally filter by product name and/or HWID. Requires admin sign-in.",
  inputSchema: {
    product: z.string().optional().describe("Filter by exact product name."),
    hwid: z.string().optional().describe("Filter by exact hardware ID."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product, hwid, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("customers")
      .select("id, name, hwid, product, expires_at, revoked, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (product) q = q.eq("product", product);
    if (hwid) q = q.eq("hwid", hwid);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { customers: data ?? [] },
    };
  },
});