import { z } from "zod";
export const staffCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .email()
    .max(191)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
  roleId: z.string().min(1).max(30),
});
export const roleCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  permissionKeys: z.array(z.string().max(100)).min(1).max(100),
});
export function assertRoleGrant(
  actorCapabilities: ReadonlySet<string>,
  requested: readonly string[],
) {
  if (!requested.includes("admin.access"))
    throw new Error("Staff roles require admin access.");
  if (requested.some((key) => !actorCapabilities.has(key)))
    throw new Error("You can only grant permissions you hold.");
}
