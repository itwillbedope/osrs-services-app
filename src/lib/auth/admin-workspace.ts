import { hasCapability } from "./capabilities";
import type { PermissionKey } from "./permissions";

export const adminNavigationCapabilities: Record<string, PermissionKey> = {
  "/admin": "dashboard.view",
  "/admin/users": "users.manage",
  "/admin/payments/setup": "payments.configure",
  "/admin/homepage": "homepage.manage",
  "/admin/catalogue": "products.view",
  "/admin/pricing": "pricing.view",
  "/admin/gold": "gold.view",
  "/admin/accounts": "accounts.view",
  "/admin/customers": "customers.view",
  "/admin/chat": "chat.view",
  "/admin/products": "products.view",
  "/admin/orders": "orders.view",
  "/admin/payments": "payments.view",
  "/admin/checkout": "checkout.configure",
  "/admin/launch-readiness": "payments.view",
  "/admin/custom-builds": "custom_builds.view",
  "/admin/design-system": "design_system.view",
};

export function staffLandingPath(
  capabilities: ReadonlySet<string> | readonly string[],
) {
  if (hasCapability(capabilities, "dashboard.view")) return "/admin";
  if (hasCapability(capabilities, "chat.view")) return "/admin/chat";
  if (hasCapability(capabilities, "products.view")) return "/admin/catalogue";
  return (
    Object.entries(adminNavigationCapabilities).find(([, capability]) =>
      hasCapability(capabilities, capability),
    )?.[0] ?? null
  );
}
