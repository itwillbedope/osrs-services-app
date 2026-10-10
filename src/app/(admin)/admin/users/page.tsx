import { requireCapability } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import {
  StaffCreateForm,
  StaffEditForm,
  RoleCreateForm,
} from "@/components/staff-management";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Staff users and roles",
  robots: { index: false, follow: false },
};
export default async function StaffPage() {
  const session = await requireCapability("users.manage", "/admin/users");
  const [users, allRoles, allPermissions] = await Promise.all([
    prisma.user.findMany({
      where: { accountType: "STAFF" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        updatedAt: true,
        roles: { select: { roleId: true } },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { permissions: { include: { permission: true } } },
    }),
    prisma.permission.findMany({ orderBy: { key: "asc" } }),
  ]);
  const roles = allRoles
    .sort((a, b) => {
      const preferred = ["SUPER_ADMIN", "CHAT_SUPPORT", "PRODUCT_DATA_EDITOR"];
      const rank = (key: string) => {
        const index = preferred.indexOf(key);
        return index < 0 ? preferred.length : index;
      };
      return rank(a.key) - rank(b.key);
    })
    .map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      permissionKeys: role.permissions.map((p) => p.permission.key),
    }))
    .filter(
      (role) =>
        role.permissionKeys.includes("admin.access") &&
        role.permissionKeys.every((key) => session.capabilities.has(key)),
    );
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8">
      <h1 className="text-3xl font-bold">Users & roles</h1>
      <p>
        Create staff accounts and choose the permissions they receive. Access
        changes are recorded and existing sessions are revoked.
      </p>
      <section
        aria-label="Recommended staff roles"
        className="grid gap-4 md:grid-cols-3"
      >
        {roles
          .filter((role) =>
            ["SUPER_ADMIN", "CHAT_SUPPORT", "PRODUCT_DATA_EDITOR"].includes(
              role.key,
            ),
          )
          .map((role) => (
            <article
              key={role.id}
              className="border-border bg-surface-1 rounded-xl border p-5"
            >
              <h2 className="font-bold">{role.name}</h2>
              <p className="text-text-secondary mt-3 text-sm">
                {role.description}
              </p>
            </article>
          ))}
      </section>
      <section className="border-border bg-surface-1 space-y-5 rounded-xl border p-6">
        <h2 className="text-xl font-semibold">Create user</h2>
        <StaffCreateForm roles={roles} />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Staff users</h2>
        {users.map((user) => (
          <article
            key={user.id}
            className="border-border bg-surface-1 space-y-4 rounded-xl border p-6"
          >
            <h3 className="font-semibold">{user.name ?? "Staff member"}</h3>
            <p>{user.email}</p>
            <StaffEditForm
              roles={roles}
              self={user.id === session.user.id}
              user={{
                id: user.id,
                status: user.status,
                roleId: user.roles[0]?.roleId,
                updatedAt: user.updatedAt.toISOString(),
              }}
            />
          </article>
        ))}
      </section>
      <details className="border-border bg-surface-1 rounded-xl border p-6">
        <summary className="cursor-pointer text-xl font-semibold">
          Define a new role
        </summary>
        <div className="mt-6">
          <RoleCreateForm
            permissions={allPermissions.filter((p) =>
              session.capabilities.has(p.key),
            )}
          />
        </div>
      </details>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Available roles</h2>
        {roles.map((role) => (
          <details
            key={role.id}
            className="border-border rounded-xl border p-4"
          >
            <summary>{role.name}</summary>
            <p>{role.description}</p>
            <ul className="mt-3 space-y-1">
              {role.permissionKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </main>
  );
}
