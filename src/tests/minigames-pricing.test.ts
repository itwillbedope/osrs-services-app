import { describe, expect, it } from "vitest";
import catalogue from "../../data/reference/minigames-2026-10-10.json";
import {
  calculateDirectOrderEstimate,
  type DirectOrderOffering,
} from "@/lib/direct-order/core";
const offering: DirectOrderOffering = {
  slug: "reagent-pouch",
  name: "Reagent pouch",
  shortSummary: "Reward",
  description: null,
  groupLabel: "Mixology",
  tierLabel: null,
  quantityEnabled: true,
  quantityUnit: "services",
  minimumQuantity: 1,
  maximumQuantity: 1000000,
  basePriceCents: 2040,
  pricingUnit: "per service",
  estimatedDeliveryText: null,
  requirements: [],
  facets: [
    {
      facetKey: "minigame-modifier",
      facetValue: "stream-bps-plus-0",
      label: "Stream",
    },
    {
      facetKey: "minigame-modifier",
      facetValue: "under-60-herblore-bps-plus-4000",
      label: "Under 60 Herblore",
    },
    {
      facetKey: "minigame-modifier",
      facetValue: "under-70-herblore-bps-plus-3000",
      label: "Under 70 Herblore",
    },
  ],
};
describe("minigame server pricing", () => {
  it("includes the selected Stream option without inventing a surcharge", () => {
    const quote = calculateDirectOrderEstimate(
      [offering],
      [
        {
          slug: offering.slug,
          quantity: 1,
          modifierSlugs: ["stream", "under-60-herblore"],
        },
      ],
    );
    expect(quote.subtotalCents).toBe(2856);
    expect(quote.lines[0]?.label).toContain("Stream");
  });
  it("rejects fabricated, duplicate and incompatible adjustments", () => {
    for (const modifierSlugs of [
      ["free-service"],
      ["parsec"],
      ["stream", "stream"],
      ["under-60-herblore", "under-70-herblore"],
    ])
      expect(() =>
        calculateDirectOrderEstimate(
          [offering],
          [{ slug: offering.slug, modifierSlugs }],
        ),
      ).toThrow();
  });
  it("charges per-1000 blocks and validates amounts", () => {
    const fish = { ...offering, basePriceCents: 600, minimumQuantity: 1000 };
    expect(
      calculateDirectOrderEstimate(
        [fish],
        [{ slug: fish.slug, quantity: 2000 }],
      ).subtotalCents,
    ).toBe(1200);
    for (const quantity of [0, -1, 999, 1.5, 1000001])
      expect(() =>
        calculateDirectOrderEstimate([fish], [{ slug: fish.slug, quantity }]),
      ).toThrow();
  });
  it("captures 105 unique priced options in 26 active groups", () => {
    const products = catalogue.groups.flatMap((g) => g.products);
    expect(products).toHaveLength(105);
    expect(catalogue.groups).toHaveLength(26);
    expect(new Set(products.map((p) => p.slug)).size).toBe(105);
  });
});
