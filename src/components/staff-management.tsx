"use client";
import { useActionState } from "react";
import {
  createStaffAction,
  createRoleAction,
  updateStaffAction,
} from "@/app/(admin)/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Role = {
  id: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
};
const initial = { message: "", ok: false };
function Feedback({ state }: { state: typeof initial }) {
  return state.message ? (
    <p
      role={state.ok ? "status" : "alert"}
      className={state.ok ? "text-success" : "text-danger"}
    >
      {state.message}
    </p>
  ) : null;
}
function RoleSelect({ roles, value }: { roles: Role[]; value?: string }) {
  return (
    <select
      name="roleId"
      required
      defaultValue={value}
      className="border-border bg-surface-2 w-full rounded-lg border p-3"
    >
      {roles.map((role) => (
        <option value={role.id} key={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  );
}
export function StaffCreateForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(createStaffAction, initial);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label>
        Name
        <Input name="name" required maxLength={120} />
      </label>
      <label>
        Email
        <Input name="email" type="email" required maxLength={191} />
      </label>
      <label>
        Initial password
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        <small>At least 12 characters. Share privately.</small>
      </label>
      <label>
        Role
        <RoleSelect roles={roles} />
      </label>
      <Button disabled={pending || !roles.length} type="submit">
        {pending ? "Creating…" : "Create user"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
export function StaffEditForm({
  user,
  roles,
  self,
}: {
  user: { id: string; status: string; roleId?: string; updatedAt: string };
  roles: Role[];
  self: boolean;
}) {
  const [state, action, pending] = useActionState(updateStaffAction, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="updatedAt" value={user.updatedAt} />
      <label>
        Role
        <RoleSelect roles={roles} value={user.roleId} />
      </label>
      <label>
        Status
        <select
          name="status"
          defaultValue={user.status}
          className="border-border bg-surface-2 w-full rounded-lg border p-3"
        >
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </label>
      <Button disabled={pending || self} type="submit">
        Save access
      </Button>
      {self && (
        <p className="text-text-muted text-sm">
          Another owner manages your own access.
        </p>
      )}
      <Feedback state={state} />
    </form>
  );
}
export function RoleCreateForm({
  permissions,
}: {
  permissions: { key: string; description: string }[];
}) {
  const [state, action, pending] = useActionState(createRoleAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <label>
        Role name
        <Input name="name" minLength={2} maxLength={120} required />
      </label>
      <label>
        Description
        <Input name="description" maxLength={500} />
      </label>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-3">Choose permissions</legend>
        {permissions.map((p) => (
          <label key={p.key} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="permissionKeys"
              value={p.key}
              defaultChecked={p.key === "admin.access"}
            />
            <span>
              <strong>{p.key}</strong>
              <br />
              {p.description}
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={pending}>
        Create role
      </Button>
      <Feedback state={state} />
    </form>
  );
}
