import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user-client";

export default defineTool({
  name: "verify_license",
  title: "Verify license",
  description:
    "Look up a customer license by HWID and product to see if it's valid, expired, or revoked. Requires admin sign-in.",
  inputSchema: {
    hwid: z.string().min(1).describe("Hardware ID."),
    product: z.string().min(1).describe("Product name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ hwid, product }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("customers")
      .select("id, name, product, hwid, expires_at, revoked, created_at")
      .eq("hwid", hwid)
      .eq("product", product)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data?.length) {
      const payload = { valid: false, reason: "not_found" };
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload,
      };
    }
    const now = Date.now();
    const active = data.find(
      (r) => !r.revoked && (!r.expires_at || new Date(r.expires_at).getTime() > now),
    );
    const chosen = active ?? data[0];
    const expired = !!chosen.expires_at && new Date(chosen.expires_at).getTime() <= now;
    const payload = {
      valid: !!active,
      reason: active ? "ok" : chosen.revoked ? "revoked" : expired ? "expired" : "not_found",
      customer: chosen,
      matches: data.length,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});