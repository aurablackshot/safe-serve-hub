import { defineTool } from "@lovable.dev/mcp-js";
import { PRODUCTS } from "@/lib/products";

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "List all Aura product names that licenses can be issued for.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(PRODUCTS) }],
    structuredContent: { products: [...PRODUCTS] },
  }),
});