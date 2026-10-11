import { z } from "zod";

export const staffIdentifierSchema = z
  .string()
  .trim()
  .min(3)
  .max(191)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._+@-]*$/)
  .transform((value) => value.toLowerCase());

export function safeStaffDestination(value: unknown) {
  if (typeof value !== "string" || /[\\\u0000-\u0020]/.test(value))
    return "/admin";
  try {
    const url = new URL(value, "https://staff.invalid");
    if (
      !value.startsWith("/") ||
      value.startsWith("//") ||
      url.origin !== "https://staff.invalid" ||
      !(url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
    )
      return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}

export function staffLoginHref(destination: unknown) {
  const next = safeStaffDestination(destination);
  return next === "/admin"
    ? "/admin"
    : `/admin?next=${encodeURIComponent(next)}`;
}
