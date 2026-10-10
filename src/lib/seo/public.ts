import type { Metadata } from "next";

export const publicOrigin = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://osrsservices.com"
).replace(/\/$/, "");
export function siteUrl(path: string) {
  return new URL(path, `${publicOrigin}/`).toString();
}
export function publicPageMetadata(
  title: string,
  description: string,
  path: string,
  image = "/artwork/inferno-hero.webp",
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "OSRS Services",
      title,
      description,
      url: path,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
