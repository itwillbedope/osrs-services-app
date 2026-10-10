import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { publicCatalogueWhere } from "@/lib/catalogue/queries";
import {
  directCategoryDestination,
  directServiceDestination,
} from "@/config/direct-service-routes";
import { siteUrl } from "@/lib/seo/public";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const path of [
    "/",
    "/services",
    "/skills",
    "/bossing",
    "/infernal",
    "/quiver",
    "/quests",
    "/diaries",
    "/minigames",
    "/misc-gathering",
    "/gold",
    "/products",
    "/accounts",
    "/support",
    "/terms",
    "/privacy",
    "/refund-policy",
  ]) {
    entries.set(path, {
      url: siteUrl(path),
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.7,
    });
  }
  if (
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME
  ) {
    const services = await prisma.catalogueService.findMany({
      where: { ...publicCatalogueWhere(), category: { isActive: true } },
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { slug: true } },
      },
    });
    for (const service of services) {
      const path =
        directServiceDestination(service.slug) ??
        `/services/${service.category.slug}/${service.slug}`;
      entries.set(path, {
        url: siteUrl(path),
        lastModified: service.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
      const categoryPath =
        directCategoryDestination(service.category.slug) ??
        `/services/${service.category.slug}`;
      if (!entries.has(categoryPath))
        entries.set(categoryPath, {
          url: siteUrl(categoryPath),
          changeFrequency: "weekly",
          priority: 0.6,
        });
    }
  }
  return [...entries.values()];
}
