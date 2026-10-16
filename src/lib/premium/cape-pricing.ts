export type CapePricing = Record<
  | "ranged"
  | "magic"
  | "defence"
  | "prayer"
  | "hitpoints"
  | "lowStatsBps"
  | "pureBps"
  | "oneDefenceBps"
  | "zerkerBps"
  | "noRigourBps"
  | "noBlowpipeBps"
  | "slayerDiscountBps",
  number
>;
/** Keep the shared calculator small: validate the same numeric contract without
 * bundling the admin form validation library in every public order page. */
export function parseCapePricing(value: unknown): CapePricing {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid cape pricing configuration.");
  const rules = value as Record<string, unknown>;
  for (const key of [
    "ranged",
    "magic",
    "defence",
    "prayer",
    "hitpoints",
    "lowStatsBps",
    "pureBps",
    "oneDefenceBps",
    "zerkerBps",
    "noRigourBps",
    "noBlowpipeBps",
    "slayerDiscountBps",
  ]) {
    const isStat = !key.endsWith("Bps");
    if (
      typeof rules[key] !== "number" ||
      !Number.isInteger(rules[key]) ||
      (rules[key] as number) < (isStat ? 1 : 0) ||
      (rules[key] as number) > (isStat ? 99 : 10000)
    )
      throw new Error("Invalid cape pricing configuration.");
  }
  return value as CapePricing;
}
export const capeSkills = [
  "ranged",
  "magic",
  "defence",
  "prayer",
  "hitpoints",
] as const;
export const capeBuilds = [
  { slug: "main", label: "Main account", rule: null },
  { slug: "pure-build", label: "Pure account", rule: "pureBps" },
  {
    slug: "one-defence-build",
    label: "1 Defence account",
    rule: "oneDefenceBps",
  },
  { slug: "zerker-build", label: "Zerker account", rule: "zerkerBps" },
  { slug: "restricted-build", label: "Restricted build", rule: null },
] as const;
export function percentLabel(basisPoints: number) {
  return `${basisPoints < 0 ? "−" : "+"}${Math.abs(basisPoints) / 100}%`;
}

/** Shared browser preview and authoritative quote/cart calculation. Every modifier
 * uses the selected package base; rounding happens once on the final total. */
export function calculateCapePrice(input: {
  configuration: unknown;
  baseCents: number;
  stats?: Array<{ metricKey: string; value: number }>;
  options: Array<{ slug: string; quantity?: number }>;
  infernal: boolean;
}) {
  const rules = parseCapePricing(input.configuration);
  if (
    !Number.isInteger(input.baseCents) ||
    input.baseCents <= 0 ||
    input.baseCents > 100000000
  )
    throw new Error("Choose a priced gear setup.");
  const allowed = new Set<string>([
    ...capeBuilds.filter((b) => b.slug !== "main").map((b) => b.slug),
    ...(input.infernal
      ? ["rigour-unavailable", "blowpipe-unavailable", "slayer-task"]
      : []),
  ]);
  const selected = new Set(input.options.map((o) => o.slug));
  if (
    selected.size !== input.options.length ||
    input.options.some(
      (o) => !allowed.has(o.slug) || (o.quantity != null && o.quantity !== 1),
    )
  )
    throw new Error("Choose valid, unique cape options.");
  const builds = capeBuilds.filter((b) => selected.has(b.slug));
  if (builds.length > 1) throw new Error("Choose only one account build.");
  if (selected.has("restricted-build"))
    throw new Error(
      "Restricted builds need a confirmed custom quote. Contact live chat before ordering.",
    );
  for (const skill of capeSkills) {
    const values = (input.stats ?? []).filter(
      (s) => s.metricKey === `skill.${skill}.level`,
    );
    if (
      values.length !== 1 ||
      !Number.isInteger(values[0]?.value) ||
      values[0]!.value < 1 ||
      values[0]!.value > 99
    )
      throw new Error(
        `Enter your ${skill} level. Stat-based pricing must be confirmed before checkout.`,
      );
  }
  const stat = (skill: string) =>
    input.stats!.find((s) => s.metricKey === `skill.${skill}.level`)!.value;
  const build = builds[0] ?? capeBuilds[0];
  const rates = [
    {
      label: `Account build (${build.label})`,
      bps: build.rule ? rules[build.rule] : 0,
    },
    ...(input.infernal
      ? [
          {
            label: selected.has("rigour-unavailable")
              ? "Rigour unavailable"
              : "Rigour available (included)",
            bps: selected.has("rigour-unavailable") ? rules.noRigourBps : 0,
          },
          {
            label: selected.has("blowpipe-unavailable")
              ? "Blowpipe unavailable"
              : "Blowpipe available (included)",
            bps: selected.has("blowpipe-unavailable") ? rules.noBlowpipeBps : 0,
          },
          {
            label: selected.has("slayer-task")
              ? "Inferno Slayer task discount"
              : "Inferno Slayer task (not active)",
            bps: selected.has("slayer-task") ? -rules.slayerDiscountBps : 0,
          },
        ]
      : []),
    {
      label: "Stats adjustment",
      bps:
        stat("ranged") < rules.ranged || stat("magic") < rules.magic
          ? rules.lowStatsBps
          : 0,
    },
  ];
  const totalBps = rates.reduce((sum, rate) => sum + rate.bps, 10000);
  if (totalBps <= 0)
    throw new Error("This configuration needs a custom quote.");
  const totalCents = Math.round((input.baseCents * totalBps) / 10000);
  const lines = rates.map((rate) => ({
    label: `${rate.label}${rate.bps ? ` (${percentLabel(rate.bps)})` : ""}`,
    amountCents: Math.round((input.baseCents * rate.bps) / 10000),
  }));
  // Allocate any fractional-cent difference to the last adjustment so visible
  // price lines always sum exactly to the total saved in the order snapshot.
  const difference =
    totalCents -
    input.baseCents -
    lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (difference) lines[lines.length - 1]!.amountCents += difference;
  return { totalCents, lines, build: build.label };
}
