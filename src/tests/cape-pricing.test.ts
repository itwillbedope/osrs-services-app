import { describe, expect, it } from "vitest";
import { calculateCapePrice } from "@/lib/premium/cape-pricing";
import { parseCapePricing } from "@/lib/premium/cape-pricing";
import { capePricingSchema } from "@/lib/premium/cape-schema";
const infernal = {
  ranged: 95,
  magic: 94,
  defence: 90,
  prayer: 90,
  hitpoints: 90,
  lowStatsBps: 2000,
  pureBps: 3000,
  oneDefenceBps: 3000,
  zerkerBps: 2000,
  noRigourBps: 500,
  noBlowpipeBps: 500,
  slayerDiscountBps: 1000,
};
const quiver = {
  ...infernal,
  ranged: 90,
  magic: 85,
  defence: 70,
  prayer: 77,
  hitpoints: 85,
  noRigourBps: 0,
  noBlowpipeBps: 0,
  slayerDiscountBps: 0,
};
function price(
  baseCents: number,
  options: string[] = [],
  overrides: Record<string, number> = {},
  isInfernal = true,
) {
  const config = isInfernal ? infernal : quiver;
  return calculateCapePrice({
    configuration: config,
    baseCents,
    options: options.map((slug) => ({ slug })),
    stats: ["ranged", "magic", "defence", "prayer", "hitpoints"].map((s) => ({
      metricKey: `skill.${s}.level`,
      value: overrides[s] ?? config[s as keyof typeof config],
    })),
    infernal: isInfernal,
  });
}
describe("Owner-approved additive cape prices", () => {
  it("keeps the lightweight public validator aligned with admin configuration bounds", () => {
    expect(parseCapePricing(infernal)).toEqual(
      capePricingSchema.parse(infernal),
    );
    for (const bad of [
      null,
      [],
      { ...infernal, ranged: 0 },
      { ...infernal, magic: 100 },
      { ...infernal, pureBps: -1 },
      { ...infernal, lowStatsBps: 10001 },
      { ...infernal, noRigourBps: 1.5 },
      { ...infernal, hitpoints: undefined },
    ]) {
      expect(() => parseCapePricing(bad)).toThrow();
      expect(capePricingSchema.safeParse(bad).success).toBe(false);
    }
  });
  it.each([
    [6500, [], {}, 6500],
    [7500, [], {}, 7500],
    [8500, [], {}, 8500],
    [6500, ["rigour-unavailable", "blowpipe-unavailable"], {}, 7150],
    [6500, ["slayer-task"], {}, 5850],
    [7500, ["pure-build"], { ranged: 90 }, 11250],
    [6500, ["pure-build"], {}, 8450],
    [6500, ["one-defence-build"], {}, 8450],
    [6500, ["zerker-build"], {}, 7800],
    [6500, [], { ranged: 94, magic: 93 }, 7800],
    [6500, [], { defence: 1, prayer: 1, hitpoints: 10 }, 6500],
    [
      6500,
      ["rigour-unavailable", "blowpipe-unavailable", "slayer-task"],
      {},
      6500,
    ],
  ])(
    "Infernal example %j %j %j equals %j",
    (base, options, stats, expected) => {
      const result = price(
        base as number,
        options as string[],
        stats as Record<string, number>,
      );
      expect(result.totalCents).toBe(expected);
      expect(
        (base as number) + result.lines.reduce((s, l) => s + l.amountCents, 0),
      ).toBe(expected);
    },
  );
  it.each([
    [5000, [], {}, 5000],
    [6500, [], {}, 6500],
    [5000, ["pure-build"], {}, 6500],
    [6500, ["pure-build"], {}, 8450],
    [5000, ["zerker-build"], {}, 6000],
    [6500, [], { ranged: 89 }, 7800],
    [6500, ["pure-build"], { ranged: 89 }, 9750],
    [6500, ["pure-build"], { ranged: 89, magic: 84 }, 9750],
  ])("Quiver example %j %j %j equals %j", (base, options, stats, expected) => {
    expect(
      price(
        base as number,
        options as string[],
        stats as Record<string, number>,
        false,
      ).totalCents,
    ).toBe(expected);
  });
  it("rejects bypasses, multiple builds, duplicate options and missing/invalid stats", () => {
    for (const options of [
      ["restricted-build"],
      ["pure-build", "zerker-build"],
      ["slayer-task", "slayer-task"],
      ["stream"],
      ["made-up"],
    ])
      expect(() => price(6500, options)).toThrow();
    expect(() => price(5000, ["slayer-task"], {}, false)).toThrow();
    expect(() => price(6500, [], { ranged: 0 })).toThrow(/ranged/);
    expect(() => price(6500, [], { magic: 100 })).toThrow(/magic/);
    expect(() =>
      calculateCapePrice({
        configuration: infernal,
        baseCents: 6500,
        options: [],
        infernal: true,
      }),
    ).toThrow(/confirmed before checkout/);
  });
  it("allocates fractional cents so breakdown equals total", () => {
    const result = price(6501, ["rigour-unavailable", "blowpipe-unavailable"], {
      ranged: 90,
    });
    expect(6501 + result.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(
      result.totalCents,
    );
  });
});
