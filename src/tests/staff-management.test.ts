import { describe, expect, it } from "vitest";
import {
  assertRoleGrant,
  staffCreateSchema,
} from "@/lib/auth/staff-management";
describe("staff access", () => {
  it("prevents privilege escalation and requires admin access", () => {
    const actor = new Set(["admin.access", "users.manage", "products.view"]);
    expect(() =>
      assertRoleGrant(actor, ["admin.access", "products.view"]),
    ).not.toThrow();
    expect(() =>
      assertRoleGrant(actor, ["admin.access", "payments.refund"]),
    ).toThrow();
    expect(() => assertRoleGrant(actor, ["products.view"])).toThrow();
  });
  it("normalizes email and rejects short passwords", () => {
    const data = {
      name: "Staff",
      email: "Owner@Example.com",
      password: "a-long-test-password",
      roleId: "role-id",
    };
    expect(staffCreateSchema.parse(data).email).toBe("owner@example.com");
    expect(
      staffCreateSchema.safeParse({ ...data, password: "short" }).success,
    ).toBe(false);
  });
});
