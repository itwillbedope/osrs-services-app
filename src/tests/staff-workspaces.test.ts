import { describe, expect, it } from "vitest";
import { defaultRoles } from "../../prisma/seed-core";
import { allPermissionKeys } from "@/lib/auth/permissions";
import {
  adminNavigationCapabilities,
  staffLandingPath,
} from "@/lib/auth/admin-workspace";
import { summarizeSales } from "@/lib/admin/sales-summary";

describe("staff workspace boundaries", () => {
  it("Head has all capabilities and Chat Support has only chat navigation", () => {
    const head = defaultRoles.find((r) => r.key === "SUPER_ADMIN")!;
    const chat = defaultRoles.find((r) => r.key === "CHAT_SUPPORT")!;
    expect(head.permissions).toEqual(allPermissionKeys);
    expect(staffLandingPath(head.permissions)).toBe("/admin");
    expect(staffLandingPath(chat.permissions)).toBe("/admin/chat");
    expect(
      Object.entries(adminNavigationCapabilities)
        .filter(([, cap]) => chat.permissions.includes(cap))
        .map(([path]) => path),
    ).toEqual(["/admin/chat"]);
    expect(
      chat.permissions.every(
        (p) => p === "admin.access" || p.startsWith("chat."),
      ),
    ).toBe(true);
  });
  it("Products & Data Editor can publish listings but has no finance/customer/chat/user access", () => {
    const editor = defaultRoles.find((r) => r.key === "PRODUCT_DATA_EDITOR")!;
    expect(staffLandingPath(editor.permissions)).toBe("/admin/catalogue");
    expect(editor.permissions).toContain("accounts.publish");
    expect(editor.permissions).toContain("products.edit");
    expect(editor.permissions).toContain("pricing.publish");
    expect(
      editor.permissions.filter((p) =>
        /^(dashboard|orders|payments|customers|users|chat|checkout|exports)\./.test(
          p,
        ),
      ),
    ).toEqual([]);
  });
  it("does not invent a destination for an account without a workspace capability", () => {
    expect(staffLandingPath(["admin.access"])).toBeNull();
  });
});

describe("sales summary", () => {
  it("keeps currencies separate and subtracts refunds without counting refunded orders twice", () => {
    expect(
      summarizeSales(
        [
          { currencyCode: "USD", amountCents: 15000, count: 2 },
          { currencyCode: "GBP", amountCents: 4000, count: 1 },
        ],
        [
          { currencyCode: "USD", amountCents: 2500 },
          { currencyCode: "USD", amountCents: 500 },
        ],
      ),
    ).toEqual([
      {
        currencyCode: "GBP",
        grossCents: 4000,
        refundCents: 0,
        netCents: 4000,
        paidOrders: 1,
      },
      {
        currencyCode: "USD",
        grossCents: 15000,
        refundCents: 3000,
        netCents: 12000,
        paidOrders: 2,
      },
    ]);
    expect(summarizeSales([], [])).toEqual([]);
  });
});
