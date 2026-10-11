"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authenticateCredentials } from "@/lib/auth/credentials";
import {
  clearLoginRateLimit,
  checkLoginRateLimit,
} from "@/lib/auth/rate-limit";
import { createSession, deleteCurrentSession } from "@/lib/auth/session";
import { safeStaffDestination } from "@/lib/auth/staff-login";

export type LoginState = { error?: string };

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const email = formData.get("email");
  const rateLimitKey = `${ipAddress}:${typeof email === "string" ? email.toLowerCase() : "unknown"}`;
  const limit = checkLoginRateLimit(rateLimitKey);

  if (!limit.allowed) {
    return {
      error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const result = await authenticateCredentials({
    email,
    password: formData.get("password"),
  });

  if (!result.ok) {
    return { error: "Username or password is incorrect." };
  }

  clearLoginRateLimit(rateLimitKey);
  await createSession(result.user.id, {
    ipAddress,
    userAgent: headerStore.get("user-agent") ?? undefined,
  });
  redirect(safeStaffDestination(formData.get("next")));
}

export async function logoutAction() {
  await deleteCurrentSession();
  redirect("/admin");
}
