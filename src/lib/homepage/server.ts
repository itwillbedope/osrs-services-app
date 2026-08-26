import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  defaultHomepageSections,
  formatHomepagePrice,
  homepageItemInputSchema,
  homepageSectionInputSchema,
  parseBulletPoints,
  safeHomepageHref,
  selectHomepageItems,
  type HomepageCard,
} from "@/lib/homepage/core";

type RawHomepageItem = Awaited<
  ReturnType<typeof prisma.homepageItem.findMany>
>[number];

async function resolveHomepageItem(
  item: RawHomepageItem,
): Promise<HomepageCard> {
  let title = "OSRS service";
  let description =
    "Configure this service and review the requirements before ordering.";
  let href = "/services";
  let imagePath: string | null = null;
  let automaticPrice: number | null = null;

  if (item.sourceType === "SERVICE" && item.linkedRecordId) {
    const service = await prisma.catalogueService.findUnique({
      where: { id: item.linkedRecordId },
      select: {
        name: true,
        slug: true,
        shortSummary: true,
        category: { select: { slug: true } },
      },
    });
    if (service) {
      title = service.name;
      description = service.shortSummary;
      href = `/services/${service.category.slug}/${service.slug}`;
    }
  } else if (item.sourceType === "PRODUCT" && item.linkedRecordId) {
    const product = await prisma.product.findUnique({
      where: { id: item.linkedRecordId },
      select: {
        publicTitle: true,
        shortDescription: true,
        slug: true,
        defaultImagePath: true,
        variants: {
          where: { enabled: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { baseUnitPriceCents: true },
        },
      },
    });
    if (product) {
      title = product.publicTitle;
      description = product.shortDescription;
      href = `/products/${product.slug}`;
      imagePath = product.defaultImagePath;
      automaticPrice = product.variants[0]?.baseUnitPriceCents ?? null;
    }
  } else if (item.sourceType === "ACCOUNT" && item.linkedRecordId) {
    const account = await prisma.accountListing.findUnique({
      where: { id: item.linkedRecordId },
      select: {
        publicTitle: true,
        shortDescription: true,
        slug: true,
        basePriceCents: true,
        images: {
          where: { isPublic: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { assetPath: true },
        },
      },
    });
    if (account) {
      title = account.publicTitle;
      description = account.shortDescription;
      href = `/accounts/${account.slug}`;
      imagePath = account.images[0]?.assetPath ?? null;
      automaticPrice = account.basePriceCents;
    }
  } else if (item.sourceType === "GOLD" && item.linkedRecordId) {
    const gold = await prisma.goldMarket.findUnique({
      where: { id: item.linkedRecordId },
      select: { publicName: true, description: true },
    });
    if (gold) {
      title = gold.publicName;
      description = gold.description;
      href = "/gold";
    }
  } else if (item.sourceType === "CUSTOM_BUILD" && item.linkedRecordId) {
    const build = await prisma.customBuildService.findUnique({
      where: { id: item.linkedRecordId },
      select: {
        publicName: true,
        publicDescription: true,
        minimumAutomaticEstimateCents: true,
      },
    });
    if (build) {
      title = build.publicName;
      description = build.publicDescription;
      href = "/custom-account-build";
      automaticPrice = build.minimumAutomaticEstimateCents;
    }
  }

  const price =
    item.priceMode === "HIDE"
      ? null
      : item.priceMode === "OVERRIDE"
        ? item.promotionalPriceCents
        : automaticPrice;

  return {
    id: item.id,
    placement: item.placement,
    sourceType: item.sourceType,
    title: item.titleOverride ?? title,
    description: item.descriptionOverride ?? description,
    badge: item.badgeText,
    badgeStyle: item.badgeStyle,
    bullets: parseBulletPoints(item.bulletPoints),
    imagePath: item.imagePath ?? imagePath,
    imageAltText: item.imageAltText ?? `${item.titleOverride ?? title} artwork`,
    ctaText: item.ctaText ?? "View service",
    href: safeHomepageHref(item.ctaUrl ?? href),
    priceLabel: formatHomepagePrice(price),
    oldPriceLabel: formatHomepagePrice(item.oldPriceCents),
    categoryLabel: item.categoryLabel,
    displayOrder: item.displayOrder,
  };
}

export async function getPublicHomepageContent() {
  const now = new Date();
  const [sections, items] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.homepageItem.findMany({
      where: { archivedAt: null },
      orderBy: [{ placement: "asc" }, { displayOrder: "asc" }],
    }),
  ]);
  const sectionMap = new Map(
    sections.map((section) => [section.sectionKey, section]),
  );
  const config = defaultHomepageSections.map(
    (fallback) => sectionMap.get(fallback.sectionKey) ?? fallback,
  );
  const limits = new Map(
    config.map((section) => [section.sectionKey, section.itemLimit]),
  );
  const selected = [
    ...selectHomepageItems(
      items,
      "MAIN_CATEGORY",
      limits.get("main-categories") ?? 4,
      now,
    ),
    ...selectHomepageItems(
      items,
      "MAIN_SERVICE",
      limits.get("main-services") ?? 7,
      now,
    ),
    ...selectHomepageItems(
      items,
      "FEATURED_SERVICE",
      limits.get("featured-services") ?? 4,
      now,
    ),
  ];
  const cards = await Promise.all(selected.map(resolveHomepageItem));
  return { sections: config, cards };
}

export async function getHomepageAdminData() {
  const [sections, items, services, products, accounts, gold, customBuilds] =
    await Promise.all([
      prisma.homepageSection.findMany({ orderBy: { displayOrder: "asc" } }),
      prisma.homepageItem.findMany({
        where: { archivedAt: null },
        orderBy: [{ placement: "asc" }, { displayOrder: "asc" }],
      }),
      prisma.catalogueService.findMany({
        orderBy: { name: "asc" },
        take: 250,
        select: { id: true, name: true, category: { select: { name: true } } },
      }),
      prisma.product.findMany({
        orderBy: { publicTitle: "asc" },
        take: 250,
        select: { id: true, publicTitle: true },
      }),
      prisma.accountListing.findMany({
        orderBy: { publicTitle: "asc" },
        take: 250,
        select: { id: true, publicTitle: true },
      }),
      prisma.goldMarket.findMany({
        orderBy: { publicName: "asc" },
        select: { id: true, publicName: true },
      }),
      prisma.customBuildService.findMany({
        orderBy: { publicName: "asc" },
        select: { id: true, publicName: true },
      }),
    ]);
  return {
    sections,
    items,
    sources: { services, products, accounts, gold, customBuilds },
  };
}

function dateValue(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid schedule date.");
  return date;
}

export async function saveHomepageSection(args: {
  input: unknown;
  actorId: string;
}) {
  const input = homepageSectionInputSchema.parse(args.input);
  await prisma.$transaction(async (transaction) => {
    const result = await transaction.homepageSection.updateMany({
      where: { id: input.id, concurrencyVersion: input.concurrencyVersion },
      data: {
        title: input.title,
        enabled: input.enabled,
        itemLimit: input.itemLimit,
        displayOrder: input.displayOrder,
        concurrencyVersion: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new Error("This section changed. Refresh and try again.");
    await transaction.auditLog.create({
      data: {
        actorId: args.actorId,
        action: "homepage.section.updated",
        targetType: "HomepageSection",
        targetId: input.id,
        metadata: {
          title: input.title,
          enabled: input.enabled,
          itemLimit: input.itemLimit,
        },
      },
    });
  });
}

export async function saveHomepageItem(args: {
  input: unknown;
  actorId: string;
}) {
  const input = homepageItemInputSchema.parse(args.input);
  const data = {
    placement: input.placement,
    sourceType: input.sourceType,
    linkedRecordId: input.linkedRecordId ?? null,
    titleOverride: input.titleOverride ?? null,
    descriptionOverride: input.descriptionOverride ?? null,
    badgeText: input.badgeText ?? null,
    badgeStyle: input.badgeStyle ?? null,
    bulletPoints: input.bulletPoints,
    imagePath: input.imagePath ?? null,
    imageAltText: input.imageAltText ?? null,
    ctaText: input.ctaText ?? null,
    ctaUrl: input.ctaUrl ? safeHomepageHref(input.ctaUrl) : null,
    priceMode: input.priceMode,
    promotionalPriceCents: input.promotionalPriceCents ?? null,
    oldPriceCents: input.oldPriceCents ?? null,
    categoryLabel: input.categoryLabel ?? null,
    displayOrder: input.displayOrder,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
    startsAt: dateValue(input.startsAt),
    expiresAt: dateValue(input.expiresAt),
    updatedById: args.actorId,
  };
  return prisma.$transaction(async (transaction) => {
    let itemId = input.id;
    if (input.id) {
      const result = await transaction.homepageItem.updateMany({
        where: { id: input.id, concurrencyVersion: input.concurrencyVersion },
        data: { ...data, concurrencyVersion: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new Error("This card changed. Refresh and try again.");
    } else {
      const item = await transaction.homepageItem.create({
        data: { ...data, createdById: args.actorId },
        select: { id: true },
      });
      itemId = item.id;
    }
    await transaction.auditLog.create({
      data: {
        actorId: args.actorId,
        action: input.id ? "homepage.item.updated" : "homepage.item.created",
        targetType: "HomepageItem",
        targetId: itemId,
        metadata: {
          placement: input.placement,
          sourceType: input.sourceType,
          displayOrder: input.displayOrder,
        },
      },
    });
    return itemId;
  });
}

export async function setHomepageItemActive(args: {
  id: string;
  active: boolean;
  actorId: string;
  expectedVersion: number;
}) {
  await prisma.$transaction(async (transaction) => {
    const result = await transaction.homepageItem.updateMany({
      where: {
        id: args.id,
        concurrencyVersion: args.expectedVersion,
        archivedAt: null,
      },
      data: {
        isActive: args.active,
        updatedById: args.actorId,
        concurrencyVersion: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new Error("This card changed. Refresh and try again.");
    await transaction.auditLog.create({
      data: {
        actorId: args.actorId,
        action: args.active
          ? "homepage.item.enabled"
          : "homepage.item.disabled",
        targetType: "HomepageItem",
        targetId: args.id,
      },
    });
  });
}

export async function archiveHomepageItem(args: {
  id: string;
  actorId: string;
  expectedVersion: number;
}) {
  await prisma.$transaction(async (transaction) => {
    const result = await transaction.homepageItem.updateMany({
      where: {
        id: args.id,
        concurrencyVersion: args.expectedVersion,
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
        isActive: false,
        updatedById: args.actorId,
        concurrencyVersion: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new Error("This card changed. Refresh and try again.");
    await transaction.auditLog.create({
      data: {
        actorId: args.actorId,
        action: "homepage.item.archived",
        targetType: "HomepageItem",
        targetId: args.id,
      },
    });
  });
}

export function homepageErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 240);
  return "The homepage update could not be saved.";
}
