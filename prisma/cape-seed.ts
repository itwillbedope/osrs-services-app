import type { PrismaClient } from "../src/generated/prisma/client";

/** One-time owner-approved commercial revision. Presence of capePricingRules is
 * the marker; later deployments preserve authorized admin edits. */
export async function seedCapePricing(prisma: PrismaClient) {
  for (const infernal of [true, false]) {
    await prisma.$transaction(async (tx) => {
      const service = await tx.catalogueService.findUnique({
        where: {
          canonicalSlug: infernal
            ? "infernal-cape-service"
            : "dizanas-quiver-service",
        },
        include: { premiumConfig: true, premiumPackages: true },
      });
      const config = service?.premiumConfig;
      if (!service || !config || config.capePricingRules != null) return;
      const capePricingRules = {
        ranged: infernal ? 95 : 90,
        magic: infernal ? 94 : 85,
        defence: infernal ? 90 : 70,
        prayer: infernal ? 90 : 77,
        hitpoints: infernal ? 90 : 85,
        lowStatsBps: 2000,
        pureBps: 3000,
        oneDefenceBps: 3000,
        zerkerBps: 2000,
        noRigourBps: infernal ? 500 : 0,
        noBlowpipeBps: infernal ? 500 : 0,
        slayerDiscountBps: infernal ? 1000 : 0,
      };
      await tx.premiumServiceConfig.update({
        where: { id: config.id },
        data: {
          capePricingRules,
          statPricingRules: [],
          discordStreamEnabled: false,
          supportsManualStatFallback: true,
          normalModeMultiplierBps: 0,
          ironmanMultiplierBps: 0,
          hardcoreIronmanMultiplierBps: 0,
          ultimateIronmanMultiplierBps: 0,
        },
      });
      const setups = infernal
        ? ([
            [
              "twisted-bow",
              "Twisted Bow setup",
              6500,
              "Twisted Bow and a complete Inferno-ready equipment setup.",
            ],
            [
              "bowfa",
              "Bowfa setup",
              7500,
              "Bow of Faerdhinen and a complete Inferno-ready equipment setup.",
            ],
            [
              "armadyl-crossbow",
              "Armadyl Crossbow setup",
              8500,
              "Armadyl Crossbow and a complete Inferno-ready equipment setup.",
            ],
          ] as const)
        : ([
            [
              "full-colosseum-clear",
              "Top Tier Gear",
              5000,
              "Twisted Bow, Scythe of Vitur, Tumeken's Shadow and other best-in-slot equipment suitable for the Fortis Colosseum.",
            ],
            [
              "mid-tier-gear",
              "Mid Tier Gear",
              6500,
              "Bow of Faerdhinen (Bowfa), Armadyl Crossbow, Dragon Crossbow, Trident of the Swamp and other suitable mid-tier equipment.",
            ],
          ] as const);
      await tx.premiumPackage.updateMany({
        where: { configId: config.id },
        data: { enabled: false },
      });
      for (const [
        index,
        [slug, name, cents, description],
      ] of setups.entries()) {
        const data = {
          name,
          shortDescription: description,
          basePriceCents: cents,
          minimumPriceCents: cents,
          setupFeeCents: 0,
          gearUnconfirmedAdjustmentCents: 0,
          customerGearRequired: false,
          enabled: true,
          displayOrder: index * 10,
          gearNotes: description,
          needsClientReview: false,
        };
        await tx.premiumPackage.upsert({
          where: { configId_slug: { configId: config.id, slug } },
          create: { serviceId: service.id, configId: config.id, slug, ...data },
          update: data,
        });
      }
      await tx.premiumOption.updateMany({
        where: { configId: config.id },
        data: { enabled: false },
      });
      if (!infernal)
        await tx.catalogueServiceGameMode.deleteMany({
          where: { serviceId: service.id, gameMode: "HARDCORE_IRONMAN" },
        });
      await tx.catalogueService.update({
        where: { id: service.id },
        data: {
          version: { increment: 1 },
          isQuoteOnly: false,
          needsClientReview: false,
          publicPreparationNotes:
            "Customers must provide all required gear, equipment, and supplies for the selected service.",
        },
      });
    });
  }
}
