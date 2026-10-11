import { Gem, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/actions";
import { AdminNav } from "@/components/admin-nav";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { StaffChatBell, StaffChatFeed } from "@/components/staff-chat-feed";

export function AdminShell({
  children,
  user,
  capabilities,
}: {
  children: ReactNode;
  user: { name: string | null; email: string };
  capabilities: readonly string[];
}) {
  const content = (
    <div className="staff-interface bg-background min-h-screen lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="border-border bg-surface-1/95 border-b shadow-2xl shadow-black/25 backdrop-blur lg:fixed lg:inset-y-0 lg:z-20 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-20 items-center justify-between px-5 lg:h-24 lg:px-6">
          <Link href="/admin" aria-label="Admin overview">
            <BrandLogo priority className="w-40 lg:w-44" />
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            {capabilities.includes("chat.view") && <StaffChatBell />}
            <ShieldCheck aria-label="Protected" className="text-gold size-4" />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="hidden px-7 pb-3 lg:block">
          <p className="text-gold kicker-type">Staff workspace</p>
          <p className="text-text-muted mt-2 text-xs leading-5">
            Trusted tools for service operations.
          </p>
        </div>

        <div className="border-border/70 lg:mx-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:border-t lg:pt-5">
          <p className="text-text-muted kicker-type mb-2 hidden px-3 lg:block">
            Workspace
          </p>
          <AdminNav capabilities={capabilities} />
        </div>

        <div className="border-border bg-background/25 hidden border-t p-4 lg:block lg:shrink-0">
          <div className="border-border bg-surface-2/65 mb-3 flex items-center gap-3 rounded-xl border px-3 py-3">
            <span className="border-gold/20 bg-gold-muted/45 text-gold flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Gem className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user.name ?? "Staff member"}
              </p>
              <p className="screenshot-sensitive text-text-muted truncate text-xs">
                {user.email}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="border-border bg-background/75 sticky top-0 z-10 hidden h-20 items-center justify-between border-b px-8 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-xs font-bold tracking-[0.16em] uppercase">
              OSRS Services
            </span>
            <span className="text-border-strong">/</span>
            <span className="text-sm font-semibold">Administration</span>
          </div>
          <div className="flex items-center gap-3">
            {capabilities.includes("chat.view") && <StaffChatBell />}
            <span className="border-success/25 bg-success/8 text-success inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
              <span className="bg-success size-1.5 rounded-full shadow-[0_0_10px_var(--success)]" />
              Secure session
            </span>
          </div>
        </header>
        <div className="admin-atmosphere">{children}</div>
      </div>
    </div>
  );
  return capabilities.includes("chat.view") ? (
    <StaffChatFeed>{content}</StaffChatFeed>
  ) : (
    content
  );
}
