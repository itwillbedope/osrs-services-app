import type { PrismaClient } from "../src/generated/prisma/client";

export async function seedDirectStream(prisma: PrismaClient) {
  const offerings = await prisma.catalogueOffering.findMany({
    where: {
      service: {
        canonicalSlug: {
          in: [
            "quest-progression",
            "diary-progression",
            "ironman-gathering-support",
          ],
        },
      },
      facets: {
        none: {
          facetKey: "minigame-modifier",
          facetValue: { startsWith: "stream-bps-" },
        },
      },
    },
    select: { id: true },
  });
  if (offerings.length)
    await prisma.catalogueOfferingFacet.createMany({
      data: offerings.map((o) => ({
        offeringId: o.id,
        facetKey: "minigame-modifier",
        facetValue: "stream-bps-plus-1000",
        label: "Stream (+10%)",
        displayOrder: 999,
      })),
      skipDuplicates: true,
    });
}
