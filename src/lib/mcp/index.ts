import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProducts from "./tools/list-products";
import listCustomers from "./tools/list-customers";
import createCustomer from "./tools/create-customer";
import revokeCustomer from "./tools/revoke-customer";
import verifyLicense from "./tools/verify-license";
import listAppVersions from "./tools/list-app-versions";

// Build the OAuth issuer from the Vite-inlined project ref so the published
// build points at the direct Supabase host (the .lovable.cloud proxy would
// fail RFC 8414 issuer matching). Fallback keeps module eval safe when the
// literal is missing during manifest extraction.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aura-panel-mcp",
  title: "Aura Panel MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Aura Panel license admin. Use `list_products` to see available products, `list_customers` / `verify_license` to inspect licenses, `create_customer` to issue a new license, and `revoke_customer` to revoke one. `list_app_versions` shows the current published build for each product.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProducts,
    listCustomers,
    createCustomer,
    revokeCustomer,
    verifyLicense,
    listAppVersions,
  ],
});