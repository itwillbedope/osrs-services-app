import type { PrismaClient } from "../src/generated/prisma/client";
import catalogue from "../data/reference/minigames-2026-10-10.json";

/** Customer-authorized reference rates. Initialize once; preserve staff edits. */
export async function seedMinigames(prisma: PrismaClient) {
  const category = await prisma.catalogueCategory.findUnique({
    where: { slug: "minigames" },
  });
  if (!category) return;
  await prisma.$transaction(
    async (tx) => {
      if (
        await tx.catalogueService.findUnique({
          where: { seededKey: "minigames-20261010" },
        })
      )
        return;
      const service = await tx.catalogueService.create({
        data: {
          seededKey: "minigames-20261010",
          categoryId: category.id,
          name: "OSRS Minigames",
          slug: "minigames-services",
          canonicalSlug: "minigames-services",
          shortSummary:
            "Choose minigame rewards, points, outfits and unlocks with clear quantities and prices.",
          content:
            "Explore minigame rewards and account activities. Choose a package or points service, set the quantity, and review your account preparation before ordering. Requirements and timing are confirmed before starting.",
          engineType: "CATALOGUE_CARD",
          publicationStatus: "PUBLISHED",
          availabilityState: "AVAILABLE",
          isQuoteOnly: false,
          needsClientReview: false,
          displayOrder: 40,
          seoTitle: "OSRS Minigame Services | Torso, Void, LMS & Rewards",
          seoDescription:
            "Order OSRS minigame rewards, points and outfits. Browse Barbarian Assault, Pest Control, LMS, Mage Training Arena and more with transparent pricing.",
        },
      });
      await tx.catalogueServiceGameMode.createMany({
        data: ["NORMAL", "IRONMAN", "HARDCORE_IRONMAN", "ULTIMATE_IRONMAN"].map(
          (gameMode) => ({
            serviceId: service.id,
            gameMode: gameMode as
              "NORMAL" | "IRONMAN" | "HARDCORE_IRONMAN" | "ULTIMATE_IRONMAN",
          }),
        ),
      });
      let displayOrder = 0;
      for (const group of catalogue.groups) {
        for (const product of group.products) {
          const offering = await tx.catalogueOffering.create({
            data: {
              seededKey: `minigames-20261010:${product.slug}`,
              serviceId: service.id,
              slug: product.slug,
              name: product.name,
              groupLabel: group.name,
              shortSummary: `${group.name} service. Account access, supplies and requirements are reviewed before starting.`,
              isActive: true,
              needsClientReview: false,
              quantityEnabled: true,
              quantityUnit: product.unit,
              minimumQuantity: product.increment,
              maximumQuantity: 1_000_000,
              basePriceCents: product.priceCents,
              pricingUnit:
                product.unit === "services" && product.increment === 1
                  ? "per service"
                  : `per ${product.increment} ${product.unit}`,
              estimatedDeliveryText: "Timing confirmed after account review",
              displayOrder: displayOrder++,
              referenceSourceKey: "bald-minigames-2026-10-10",
            },
          });
          await tx.catalogueOfferingFacet.createMany({
            data: [
              {
                offeringId: offering.id,
                facetKey: "artwork",
                facetValue: group.key,
                label: group.name,
              },
              ...[["stream", "Stream (+2%)", 200], ...group.modifiers].map(
                ([key, label, bps]) => ({
                  offeringId: offering.id,
                  facetKey: "minigame-modifier",
                  facetValue: `${key}-bps-${Number(bps) < 0 ? "minus" : "plus"}-${Math.abs(Number(bps))}`,
                  label: String(label),
                }),
              ),
            ],
          });
          const specific =
            group.name === "Mastering Mixology"
              ? "Base rates assume the required paste is prepared; choose Making Paste when preparation is needed."
              : group.name === "Deep Sea Trawling"
                ? "Each price covers 1,000 fish using the named boat and cotton nets. Confirm offcuts and ice chests."
                : group.name === "Hallowed Sepulchre"
                  ? "These rates assume 92+ Agility and access to the Hallowed Sepulchre."
                  : group.name === "Clues"
                    ? "Confirm the relevant clue steps, quests, equipment and whether a clue must be obtained from scratch."
                    : "Confirm minigame access, membership, available equipment, supplies and the account conditions named in this option.";
          await tx.catalogueOfferingRequirement.create({
            data: {
              offeringId: offering.id,
              title: "Account preparation",
              description: specific,
              type: "ACTIVITY",
              verificationMode: "SUPPORT_VERIFIED",
              isRequired: true,
              customerGuidance:
                "Requirements will be reviewed and confirmed before starting. Preparatory work may need a separate quote.",
            },
          });
        }
      }
    },
    { timeout: 60_000 },
  );
}
