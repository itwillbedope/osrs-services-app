import type { Metadata } from "next";
import type { ReactNode } from "react";

import { OfflineIndicator } from "@/components/offline-indicator";
import { Toaster } from "@/components/ui/toast";

import "./globals.css";
import "./reference-storefront.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://osrsservices.com",
  ),
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : {},
  },
  title: { default: "OSRS Services", template: "%s | OSRS Services" },
  description:
    "OSRS services for skilling, quests, minigames, bossing and account progression with clear pricing and personal support.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <OfflineIndicator />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
