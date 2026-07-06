import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-user-client";
import { computeExpiresAt, DURATIONS, PRODUCTS } from "@/lib/products";

const durationValues = DURATIONS.map((d) => d.value) as [string, ...string[]];
const productValues = [...PRODUCTS] as [string, ...string[]];

export default defineTool({
  name: "create_customer",
  title: "Create customer license",
  description:
    "Issue a new license for a customer by name, HWID, product, and duration (7d, 30d, or lifetime). Requires admin sign-in.",
  inputSchema: {
    name: z.string().min(1).describe("Customer display name."),
    hwid: z.string().min(1).describe("Hardware ID from the customer's machine."),
    product: z.enum(productValues).describe("Product name."),
    duration: z.enum(durationValues).describe("License duration: 7d, 30d, or lifetime."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, hwid, product, duration }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const expires_at = computeExpiresAt(duration as never);
    const { data, error } = await supabaseForUser(ctx)
      .from("customers")
      .insert({ name, hwid, product, expires_at, created_by: ctx.getUserId() })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { customer: data },
    };
  },
});