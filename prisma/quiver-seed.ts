import type { PrismaClient } from "../src/generated/prisma/client";

/** Add the dedicated service using the site's existing published Colosseum rate.
 * Empty update clauses preserve subsequent admin pricing and content edits. */
export async function seedQuiver(prisma: PrismaClient) {
  const now = new Date();
  const source = await prisma.bossingMethod.findFirst({
    where: {
      slug: "standard-kills",
      enabled: true,
      priceMode: "PER_KILL",
      minimumKillCount: 1,
      boss: { bossKey: "reference-colosseum", enabled: true },
      service: {
        publicationStatus: "PUBLISHED",
        availabilityState: "AVAILABLE",
        category: { isActive: true },
        AND: [
          { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
          { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
        ],
      },
    },
    include: { service: { include: { bossingRule: true, gameModes: true } } },
    orderBy: { id: "asc" },
  });
  const category = await prisma.catalogueCategory.findUnique({
    where: { slug: "premium-services" },
  });
  if (!source?.service.bossingRule || !category) return;

  await prisma.$transaction(async (tx) => {
    if (
      await tx.catalogueService.findUnique({
        where: { seededKey: "dizanas-quiver-premium" },
      })
    )
      return;
    const service = await tx.catalogueService.upsert({
      where: { seededKey: "dizanas-quiver-premium" },
      create: {
        seededKey: "dizanas-quiver-premium",
        categoryId: category.id,
        name: "Dizana's Quiver Service",
        slug: "dizanas-quiver-service",
        canonicalSlug: "dizanas-quiver-service",
        shortSummary:
          "A complete Fortis Colosseum run through Sol Heredit for Dizana's Quiver, with your account setup reviewed before starting.",
        content:
          "Complete the 12 waves of the Fortis Colosseum, including Sol Heredit, for Dizana's Quiver. Configure your account type, gear review, delivery and available stream option. Support confirms combat stats, equipment, prayers, supplies and Colosseum access before scheduling. Charging or blessing the Quiver with sunfire splinters is a separate request.",
        engineType: "PREMIUM_SERVICE_CONFIGURATOR",
        publicationStatus: "PUBLISHED",
        availabilityState: "AVAILABLE",
        isQuoteOnly: true,
        displayOrder: 38,
        needsClientReview: true,
        seoTitle: "Dizana's Quiver | Fortis Colosseum Service",
        seoDescription:
          "Configure a Fortis Colosseum completion for Dizana's Quiver with account, gear and requirement review.",
      },
      update: {},
    });
    await tx.catalogueServiceGameMode.createMany({
      data: source.service.gameModes.map(({ gameMode }) => ({
        serviceId: service.id,
        gameMode,
      })),
      skipDuplicates: true,
    });
    const {
      id: _id,
      serviceId: _serviceId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...publishedRule
    } = source.service.bossingRule!;
    void [_id, _serviceId, _createdAt, _updatedAt];
    const config = await tx.premiumServiceConfig.upsert({
      where: { serviceId: service.id },
      create: {
        ...publishedRule,
        serviceId: service.id,
        configuratorType: "COLOSSEUM",
        rsnEligibilityEnabled: false,
        supportsManualStatFallback: true,
      },
      update: {},
    });
    const pkg = await tx.premiumPackage.upsert({
      where: { seededKey: "dizanas-quiver-premium:full-clear" },
      create: {
        seededKey: "dizanas-quiver-premium:full-clear",
        serviceId: service.id,
        configId: config.id,
        slug: "full-colosseum-clear",
        name: "Full Colosseum clear — Dizana's Quiver",
        shortDescription:
          "All 12 Colosseum waves, including Sol Heredit, for one Dizana's Quiver. Your full combat setup is reviewed before starting.",
        enabled: true,
        basePriceCents: source.basePriceCentsPerKill,
        minimumPriceCents: source.minimumPriceCents,
        setupFeeCents: source.setupFeeCents,
        difficultyTierLabel: "Colosseum",
        requirementsSummary:
          "Members account, access to the Fortis Colosseum, combat stats, gear, prayers and supplies are confirmed by support.",
        gearNotes:
          "Confirm the equipment available for the Colosseum waves and the Sol Heredit fight. Support reviews weapons, armour, prayers and supplies for your account build.",
        unlockNotes:
          "Support confirms access to Varlamore and the Fortis Colosseum before scheduling.",
        customerGearRequired: source.customerGearRequired,
        customerGearLabel:
          "I have gear and supplies ready for Colosseum review",
        gearUnconfirmedAdjustmentCents: source.gearAdjustmentCents,
      },
      update: {},
    });
    const group = await tx.premiumRequirementGroup.upsert({
      where: { seededKey: "dizanas-quiver-premium:preparation" },
      create: {
        seededKey: "dizanas-quiver-premium:preparation",
        serviceId: service.id,
        configId: config.id,
        packageId: pkg.id,
        title: "Colosseum preparation",
        description:
          "Requirements are reviewed for your specific account and available setup.",
      },
      update: {},
    });
    await tx.premiumRequirement.createMany({
      data: (
        [
          [
            "access",
            "Members account and Colosseum access",
            "Confirm active membership and access to the Fortis Colosseum in Varlamore.",
            "UNLOCK",
          ],
          [
            "setup",
            "Waves and Sol Heredit setup",
            "Confirm combat stats, weapons, armour, available prayers, food and potions with support before the run.",
            "GEAR",
          ],
        ] as const
      ).map(([key, label, description, requirementType], index) => ({
        seededKey: `dizanas-quiver-premium:${key}`,
        groupId: group.id,
        label,
        description,
        requirementType,
        verificationMode: "SUPPORT_VERIFIED" as const,
        isRequired: true,
        displayOrder: index * 10,
      })),
      skipDuplicates: true,
    });
    await tx.premiumOption.upsert({
      where: { seededKey: "dizanas-quiver-premium:restricted-build" },
      create: {
        seededKey: "dizanas-quiver-premium:restricted-build",
        serviceId: service.id,
        configId: config.id,
        slug: "colosseum-restricted-build-review",
        name: "Restricted account build review",
        description:
          "Tell support about a pure or other restricted build so they can confirm a suitable Colosseum setup before starting.",
        optionType: "UNLOCK_SUPPORT",
        pricingMode: "FIXED_FEE",
      },
      update: {},
    });
    await tx.premiumFaq.createMany({
      data: (
        [
          [
            "reward",
            "What does this service cover?",
            "One complete Fortis Colosseum run through all 12 waves, finishing with Sol Heredit, to obtain Dizana's Quiver.",
          ],
          [
            "splinters",
            "Does this include a charged or blessed Quiver?",
            "Sunfire splinters and permanent blessing are separate from the completion service. Contact support to confirm the scope and price of either request.",
          ],
          [
            "requirements",
            "What if my setup needs preparation?",
            "Choose your account type and request a setup review. Support confirms your combat stats, equipment, prayers, supplies and access before starting.",
          ],
        ] as const
      ).map(([key, question, answer], index) => ({
        seededKey: `dizanas-quiver-premium:faq:${key}`,
        serviceId: service.id,
        configId: config.id,
        packageId: pkg.id,
        question,
        answer,
        displayOrder: index * 10,
      })),
      skipDuplicates: true,
    });
  });
}
