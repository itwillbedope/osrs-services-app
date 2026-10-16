import "@/app/cape-configurator.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";

import { DeferredChatLauncher } from "@/components/deferred-chat-launcher";
import { JsonLd } from "@/components/seo-jsonld";
import { siteUrl } from "@/lib/seo/public";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { getDiscordHref } from "@/config/public-navigation";

export const metadata: Metadata = { robots: { index: true, follow: true } };

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const discordHref = getDiscordHref();
  const databaseConfigured = Boolean(
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
  );
  let chatEnabled = false;
  if (databaseConfigured) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      chatEnabled = !!(
        await prisma.featureFlag.findUnique({
          where: { key: "live_chat_enabled" },
          select: { enabled: true },
        })
      )?.enabled;
    } catch {
      chatEnabled = false;
    }
  }

  return (
    <div className="min-h-screen overflow-x-clip">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground focus-visible:ring-background fixed top-3 left-3 z-[70] -translate-y-24 rounded-lg px-4 py-3 text-sm font-bold transition focus:translate-y-0 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to main content
      </a>
      <PublicHeader discordHref={discordHref} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": siteUrl("/#organization"),
          name: "OSRS Services",
          url: siteUrl("/"),
          logo: siteUrl("/branding/osrs-services-logo-red.png"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": siteUrl("/#website"),
          name: "OSRS Services",
          url: siteUrl("/"),
          publisher: { "@id": siteUrl("/#organization") },
        }}
      />
      {children}
      <PublicFooter />
      {chatEnabled ? <DeferredChatLauncher /> : null}
    </div>
  );
}
