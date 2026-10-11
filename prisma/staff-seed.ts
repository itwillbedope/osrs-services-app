import { z } from "zod";
import type { PrismaClient } from "../src/generated/prisma/client";
import { staffIdentifierSchema } from "../src/lib/auth/staff-login";

const staffAccountsSchema = z
  .array(
    z.object({
      username: staffIdentifierSchema,
      password: z.string().min(8).max(128),
      name: z.string().trim().min(1).max(120),
      role: z.enum(["SUPER_ADMIN", "CHAT_SUPPORT", "PRODUCT_DATA_EDITOR"]),
    }),
  )
  .max(3)
  .superRefine((accounts, context) => {
    if (
      new Set(accounts.map((account) => account.username)).size !==
      accounts.length
    )
      context.addIssue({
        code: "custom",
        message: "Staff identifiers must be unique.",
      });
  });

export function parseStaffSeedAccounts(value: string | undefined) {
  if (!value?.trim()) return [];
  try {
    if (value.length > 8192) throw new Error();
    return staffAccountsSchema.parse(JSON.parse(value));
  } catch {
    throw new Error(
      "Invalid STAFF_SEED_ACCOUNTS_JSON. Use up to three unique staff identifiers, recognized roles and passwords of 8–128 characters.",
    );
  }
}

export async function seedRequestedStaff(
  prisma: PrismaClient,
  accounts: ReturnType<typeof parseStaffSeedAccounts>,
  hashPassword: (password: string) => Promise<string>,
) {
  await prisma.$transaction(async (tx) => {
    for (const account of accounts) {
      const existing = await tx.user.findUnique({
        where: { email: account.username },
        include: { roles: { include: { role: { select: { key: true } } } } },
      });
      if (existing) {
        if (
          existing.accountType !== "STAFF" ||
          existing.roles.length !== 1 ||
          existing.roles[0]?.role.key !== account.role
        )
          throw new Error(
            "Staff seed cannot change an existing customer's access or existing staff role assignments.",
          );
        continue;
      }
      const role = await tx.role.findUniqueOrThrow({
        where: { key: account.role },
        select: { id: true },
      });
      const user = await tx.user.create({
        data: {
          email: account.username,
          name: account.name,
          passwordHash: await hashPassword(account.password),
          accountType: "STAFF",
          emailVerified: new Date(),
          roles: { create: { roleId: role.id } },
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "staff.initialized",
          targetType: "User",
          targetId: user.id,
          metadata: {
            roleKey: account.role,
            source: "private_hosting_configuration",
          },
        },
      });
    }
  });
}
