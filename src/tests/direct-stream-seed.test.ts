import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import { seedDirectStream } from "../../prisma/direct-stream-seed";

describe("direct Stream initialization", () => {
  it("preserves configured Stream facets and adds missing ones only once", async () => {
    const offerings = [
      { id: "configured", facets: [{ facetValue: "stream-bps-plus-1250" }] },
      {
        id: "other-modifier",
        facets: [{ facetValue: "express-bps-plus-1500" }],
      },
      { id: "missing", facets: [] as { facetValue: string }[] },
    ];
    const findMany = vi.fn(async () => offerings);
    const createMany = vi.fn(async ({ data }) => {
      for (const facet of data) {
        offerings
          .find((o) => o.id === facet.offeringId)!
          .facets.push({
            facetValue: facet.facetValue,
          });
      }
      return { count: data.length };
    });
    const prisma = {
      catalogueOffering: { findMany },
      catalogueOfferingFacet: { createMany },
    } as unknown as PrismaClient;

    await seedDirectStream(prisma);
    await seedDirectStream(prisma);

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0]![0].data).toEqual([
      expect.objectContaining({
        offeringId: "other-modifier",
        facetValue: "stream-bps-plus-1000",
      }),
      expect.objectContaining({
        offeringId: "missing",
        facetValue: "stream-bps-plus-1000",
      }),
    ]);
    expect(offerings[0]!.facets).toEqual([
      { facetValue: "stream-bps-plus-1250" },
    ]);
    expect(JSON.stringify(findMany.mock.calls)).not.toMatch(
      /startsWith|contains/,
    );
  });
});
