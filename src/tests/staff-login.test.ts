import { describe, it, expect, vi } from "vitest";
import {
  safeStaffDestination,
  staffLoginHref,
  staffIdentifierSchema,
} from "@/lib/auth/staff-login";
import { authenticateCredentialsWith } from "@/lib/auth/credentials-core";
import {
  parseStaffSeedAccounts,
  seedRequestedStaff,
} from "../../prisma/staff-seed";
import type { PrismaClient } from "@/generated/prisma/client";

describe("staff login entry", () => {
  it("creates staff with a hash, its requested role and a credential-free audit entry", async () => {
    const create = vi.fn().mockResolvedValue({ id: "new-staff" });
    const audit = vi.fn();
    const fake = {
      $transaction: async (run: (tx: unknown) => unknown) =>
        run({
          user: { findUnique: async () => null, create },
          role: { findUniqueOrThrow: async () => ({ id: "chat-role" }) },
          auditLog: { create: audit },
        }),
    } as unknown as PrismaClient;
    const accounts = parseStaffSeedAccounts(
      JSON.stringify([
        {
          username: "tester@staff",
          name: "Staff",
          password: "testpass",
          role: "CHAT_SUPPORT",
        },
      ]),
    );
    await seedRequestedStaff(fake, accounts, async () => "argon-hash");
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      email: "tester@staff",
      passwordHash: "argon-hash",
      accountType: "STAFF",
      roles: { create: { roleId: "chat-role" } },
    });
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("password");
    expect(audit.mock.calls[0]?.[0].data.metadata).toEqual({
      roleKey: "CHAT_SUPPORT",
      source: "private_hosting_configuration",
    });
    expect(JSON.stringify(audit.mock.calls)).not.toContain("testpass");
  });
  it("accepts staff usernames without relaxing customer email validation", async () => {
    expect(staffIdentifierSchema.parse(" Staff@Editor ")).toBe("staff@editor");
    const find = vi.fn().mockResolvedValue({
      id: "staff",
      email: "staff@editor",
      name: "Editor",
      status: "ACTIVE",
      accountType: "STAFF",
      passwordHash: "hashed",
    });
    expect(
      (
        await authenticateCredentialsWith(
          { email: "STAFF@EDITOR", password: "test-pass" },
          find,
          async () => true,
        )
      ).ok,
    ).toBe(true);
    find.mockClear();
    expect(
      (
        await authenticateCredentialsWith(
          { email: "staff@editor", password: "test-pass" },
          find,
          async () => true,
          "CUSTOMER",
        )
      ).ok,
    ).toBe(false);
    expect(find).not.toHaveBeenCalled();
    for (const value of ["x", "two words", "<script>", "a".repeat(192)])
      expect(staffIdentifierSchema.safeParse(value).success).toBe(false);
  });
  it("preserves admin deep links and rejects external or escaped return paths", () => {
    expect(staffLoginHref("/admin")).toBe("/admin");
    expect(staffLoginHref("/admin/chat")).toBe("/admin?next=%2Fadmin%2Fchat");
    for (const value of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/admin/../../outside",
      "/adminx",
      "/account",
      "\n/admin",
    ])
      expect(safeStaffDestination(value)).toBe("/admin");
  });
  it("validates private staff setup without echoing malformed credential payloads", () => {
    expect(parseStaffSeedAccounts(undefined)).toEqual([]);
    expect(() => parseStaffSeedAccounts("private malformed input")).toThrow(
      "Invalid STAFF_SEED_ACCOUNTS_JSON",
    );
    const account = {
      username: "tester@staff",
      name: "Staff",
      password: "testpass",
      role: "CHAT_SUPPORT",
    };
    expect(parseStaffSeedAccounts(JSON.stringify([account]))).toHaveLength(1);
    expect(() =>
      parseStaffSeedAccounts(JSON.stringify([account, account])),
    ).toThrow();
    expect(() =>
      parseStaffSeedAccounts(
        JSON.stringify([{ ...account, password: "short" }]),
      ),
    ).toThrow();
  });
  it("preserves existing passwords and refuses customer promotion or staff reassignment", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      accountType: "STAFF",
      roles: [{ role: { key: "CHAT_SUPPORT" } }],
    });
    const create = vi.fn();
    const hash = vi.fn();
    const fake = {
      $transaction: async (run: (tx: unknown) => unknown) =>
        run({ user: { findUnique, create } }),
    } as unknown as PrismaClient;
    const accounts = parseStaffSeedAccounts(
      JSON.stringify([
        {
          username: "tester@staff",
          name: "Staff",
          password: "testpass",
          role: "CHAT_SUPPORT",
        },
      ]),
    );
    await seedRequestedStaff(fake, accounts, hash);
    expect(create).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    findUnique.mockResolvedValue({ accountType: "CUSTOMER", roles: [] });
    await expect(seedRequestedStaff(fake, accounts, hash)).rejects.toThrow(
      "cannot change",
    );
    findUnique.mockResolvedValue({
      accountType: "STAFF",
      roles: [{ role: { key: "SUPER_ADMIN" } }],
    });
    await expect(seedRequestedStaff(fake, accounts, hash)).rejects.toThrow(
      "cannot change",
    );
  });
});
