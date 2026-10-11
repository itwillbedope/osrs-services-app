"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import {
  assertRoleGrant,
  roleCreateSchema,
  staffCreateSchema,
} from "@/lib/auth/staff-management";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
export type StaffActionState = { message: string; ok: boolean };
const success = (message: string) => ({ message, ok: true });
const failed = (error: unknown): StaffActionState => ({
  message:
    error instanceof z.ZodError
      ? "Check the form. Use a username or email (3–191 characters) and a password of 8–128 characters."
      : error instanceof Error &&
          error.name === "Error" &&
          [
            "Staff roles require admin access.",
            "You can only grant permissions you hold.",
            "Another owner must change your own role or access status.",
            "This user changed. Reload the page before editing again.",
            "Choose recognized permissions.",
          ].includes(error.message)
        ? error.message
        : "Could not save. Check for an existing username, email or role.",
  ok: false,
});
export async function createStaffAction(
  _state: StaffActionState,
  form: FormData,
): Promise<StaffActionState> {
  const session = await requireCapability("users.manage", "/admin/users");
  try {
    const input = staffCreateSchema.parse(Object.fromEntries(form));
    const role = await prisma.role.findUniqueOrThrow({
      where: { id: input.roleId },
      include: { permissions: { include: { permission: true } } },
    });
    assertRoleGrant(
      session.capabilities,
      role.permissions.map((p) => p.permission.key),
    );
    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          accountType: "STAFF",
          roles: { create: { roleId: role.id } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "staff.created",
          targetType: "User",
          targetId: user.id,
          metadata: { roleId: role.id },
        },
      });
    });
    revalidatePath("/admin/users");
    return success(
      "Staff user created. Share the password privately with that person.",
    );
  } catch (error) {
    return failed(error);
  }
}
export async function updateStaffAction(
  _state: StaffActionState,
  form: FormData,
): Promise<StaffActionState> {
  const session = await requireCapability("users.manage", "/admin/users");
  try {
    const input = z
      .object({
        userId: z.string().min(1).max(30),
        roleId: z.string().min(1).max(30),
        status: z.enum(["ACTIVE", "DISABLED"]),
        updatedAt: z.iso.datetime(),
      })
      .parse(Object.fromEntries(form));
    if (input.userId === session.user.id)
      throw new Error(
        "Another owner must change your own role or access status.",
      );
    await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({
        // Permission checks below cover both the current and requested role.
        where: { id: input.roleId },
        include: { permissions: { include: { permission: true } } },
      });
      assertRoleGrant(
        session.capabilities,
        role.permissions.map((p) => p.permission.key),
      );
      const target = await tx.user.findUniqueOrThrow({
        where: { id: input.userId },
        include: {
          roles: {
            include: {
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      });
      assertRoleGrant(
        session.capabilities,
        target.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission.key),
        ),
      );
      const updated = await tx.user.updateMany({
        where: {
          id: input.userId,
          accountType: "STAFF",
          updatedAt: new Date(input.updatedAt),
        },
        data: { status: input.status, updatedAt: new Date() },
      });
      if (updated.count !== 1)
        throw new Error(
          "This user changed. Reload the page before editing again.",
        );
      await tx.userRole.deleteMany({ where: { userId: input.userId } });
      await tx.userRole.create({
        data: { userId: input.userId, roleId: role.id },
      });
      await tx.session.updateMany({
        where: { userId: input.userId, audience: "STAFF", revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "staff.access.updated",
          targetType: "User",
          targetId: input.userId,
          metadata: {
            roleId: role.id,
            status: input.status,
            sessionsRevoked: true,
          },
        },
      });
    });
    revalidatePath("/admin/users");
    return success("Access updated. Existing staff sessions were revoked.");
  } catch (error) {
    return failed(error);
  }
}
export async function createRoleAction(
  _state: StaffActionState,
  form: FormData,
): Promise<StaffActionState> {
  const session = await requireCapability("users.manage", "/admin/users");
  try {
    const input = roleCreateSchema.parse({
      name: form.get("name"),
      description: form.get("description"),
      permissionKeys: form.getAll("permissionKeys"),
    });
    assertRoleGrant(session.capabilities, input.permissionKeys);
    await prisma.$transaction(async (tx) => {
      const permissions = await tx.permission.findMany({
        where: { key: { in: input.permissionKeys } },
      });
      if (permissions.length !== new Set(input.permissionKeys).size)
        throw new Error("Choose recognized permissions.");
      const role = await tx.role.create({
        data: {
          key: `CUSTOM_${randomUUID()}`,
          name: input.name,
          description: input.description,
          isSystem: false,
          permissions: {
            create: permissions.map((p) => ({ permissionId: p.id })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "staff.role.created",
          targetType: "Role",
          targetId: role.id,
          metadata: { permissionKeys: input.permissionKeys },
        },
      });
    });
    revalidatePath("/admin/users");
    return success(
      "Role created. It is now available when creating or editing staff.",
    );
  } catch (error) {
    return failed(error);
  }
}
