import { redirect } from "next/navigation";
import { staffLoginHref } from "@/lib/auth/staff-login";

export default async function LegacyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(staffLoginHref(next));
}
