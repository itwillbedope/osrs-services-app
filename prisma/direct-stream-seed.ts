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
    },
    select: {
      id: true,
      facets: {
        where: { facetKey: "minigame-modifier" },
        select: { facetValue: true },
      },
    },
  });
  // MariaDB's prepared LIKE parameters can conflict with Hostinger's column
  // collation. Compare this small, scoped catalogue in JS instead, preserving
  // any existing Stream configuration without altering database collations.
  const missingStream = offerings.filter(
    (offering) =>
      !offering.facets.some((facet) =>
        facet.facetValue.startsWith("stream-bps-"),
      ),
  );
  if (missingStream.length)
    await prisma.catalogueOfferingFacet.createMany({
      data: missingStream.map((o) => ({
        offeringId: o.id,
        facetKey: "minigame-modifier",
        facetValue: "stream-bps-plus-1000",
        label: "Stream (+10%)",
        displayOrder: 999,
      })),
      skipDuplicates: true,
    });
}
