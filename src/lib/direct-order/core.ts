export type DirectOrderFacet = {
  facetKey: string;
  facetValue: string;
  label: string;
};

export type DirectOrderRequirement = {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  customerGuidance: string | null;
};

export type DirectOrderOffering = {
  slug: string;
  name: string;
  shortSummary: string;
  description: string | null;
  groupLabel: string | null;
  tierLabel: string | null;
  quantityEnabled: boolean;
  quantityUnit: string | null;
  minimumQuantity: number | null;
  maximumQuantity: number | null;
  basePriceCents: number | null;
  pricingUnit: string | null;
  estimatedDeliveryText: string | null;
  facets: DirectOrderFacet[];
  requirements: DirectOrderRequirement[];
};

export type DirectOrderSelection = {
  slug: string;
  quantity?: number;
  modifierSlugs?: string[];
};

export function minigameModifiers(offering: DirectOrderOffering) {
  return offering.facets
    .filter((f) => f.facetKey === "minigame-modifier")
    .map((f) => {
      const match = /^([a-z0-9-]+)-bps-(plus|minus)-(\d+)$/.exec(f.facetValue);
      const bps = match
        ? Number(match[3]) * (match[2] === "minus" ? -1 : 1)
        : NaN;
      if (!match || bps < -9000 || bps > 10000) {
        throw new DirectOrderValidationError(
          "An option has invalid pricing adjustments.",
        );
      }
      return { slug: match[1]!, label: f.label, bps };
    });
}

export function directOrderLinePrice(
  offering: DirectOrderOffering,
  quantity: number,
  modifierSlugs: string[] = [],
) {
  const allowed = minigameModifiers(offering);
  if (
    new Set(modifierSlugs).size !== modifierSlugs.length ||
    modifierSlugs.length > 8
  )
    throw new DirectOrderValidationError("Choose each adjustment once.");
  const selected = modifierSlugs.map((slug) => {
    const modifier = allowed.find((m) => m.slug === slug);
    if (!modifier)
      throw new DirectOrderValidationError(
        "Choose available pricing adjustments.",
      );
    return modifier;
  });
  for (const mutuallyExclusive of [
    ["under-60-herblore", "under-70-herblore"],
    [
      "easy-combat-achievements",
      "medium-combat-achievements",
      "hard-combat-achievements",
    ],
  ]) {
    if (selected.filter((m) => mutuallyExclusive.includes(m.slug)).length > 1)
      throw new DirectOrderValidationError(
        "Choose only one applicable level or achievement tier.",
      );
  }
  const units = offering.quantityEnabled
    ? Math.ceil(quantity / Math.max(1, offering.minimumQuantity ?? 1))
    : 1;
  const multiplier = selected.reduce(
    (value, m) => (value * (10000 + m.bps)) / 10000,
    1,
  );
  return {
    amountCents: Math.round(
      (offering.basePriceCents ?? 0) * units * multiplier,
    ),
    modifierLabels: selected.map((m) => m.label),
  };
}

export type DirectOrderFilterMode = "QUESTS" | "DIARIES" | "GATHERING";

export class DirectOrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectOrderValidationError";
  }
}

export function formatDirectOrderPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function safeQuantity(offering: DirectOrderOffering, requested?: number) {
  if (!offering.quantityEnabled) return 1;
  const minimum = Math.max(1, offering.minimumQuantity ?? 1);
  const maximum = offering.maximumQuantity ?? 1_000_000_000;
  const quantity = requested ?? minimum;
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < minimum ||
    quantity > maximum
  ) {
    throw new DirectOrderValidationError(
      `${offering.name} quantity must be between ${minimum.toLocaleString()} and ${maximum.toLocaleString()}.`,
    );
  }
  return quantity;
}

export function calculateDirectOrderEstimate(
  offerings: readonly DirectOrderOffering[],
  selections: readonly DirectOrderSelection[],
) {
  if (!selections.length) {
    throw new DirectOrderValidationError("Select at least one service.");
  }
  if (selections.length > 200) {
    throw new DirectOrderValidationError("Select no more than 200 services.");
  }

  const available = new Map(
    offerings.map((offering) => [offering.slug, offering]),
  );
  const seen = new Set<string>();
  const selectedSlugs = new Set(
    selections.map(({ slug }) => slug.replace(/^reference-/, "")),
  );
  for (const selection of selections) {
    const offering = available.get(selection.slug);
    if (!offering) continue;
    const missing = diaryPrerequisiteSlugs(offerings, offering).filter(
      (slug) => !selectedSlugs.has(slug.replace(/^reference-/, "")),
    );
    if (missing.length) {
      throw new DirectOrderValidationError(
        `${offering.name} requires its earlier regional tiers in this order.`,
      );
    }
  }
  const lines = selections.map((selection) => {
    if (seen.has(selection.slug)) {
      throw new DirectOrderValidationError("Select each service only once.");
    }
    seen.add(selection.slug);
    const offering = available.get(selection.slug);
    if (!offering || offering.basePriceCents == null) {
      throw new DirectOrderValidationError(
        "Choose an available priced service.",
      );
    }
    if (
      !Number.isSafeInteger(offering.basePriceCents) ||
      offering.basePriceCents < 0
    ) {
      throw new DirectOrderValidationError(
        "A selected service has invalid pricing.",
      );
    }
    const quantity = safeQuantity(offering, selection.quantity);
    const { amountCents, modifierLabels } = directOrderLinePrice(
      offering,
      quantity,
      selection.modifierSlugs,
    );
    if (!Number.isSafeInteger(amountCents) || amountCents > 100_000_000) {
      throw new DirectOrderValidationError(
        "The selected total requires support review.",
      );
    }
    return {
      slug: offering.slug,
      name: offering.name,
      quantity,
      quantityLabel: offering.quantityEnabled
        ? `${quantity.toLocaleString()} ${offering.quantityUnit ?? "units"}`
        : null,
      amountCents,
      label:
        (offering.quantityEnabled
          ? `${offering.name} · ${quantity.toLocaleString()} ${offering.quantityUnit ?? "units"}`
          : offering.name) +
        (modifierLabels.length ? ` · ${modifierLabels.join(", ")}` : ""),
    };
  });
  const subtotalCents = lines.reduce(
    (total, line) => total + line.amountCents,
    0,
  );
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 100_000_000) {
    throw new DirectOrderValidationError("This order requires support review.");
  }
  return {
    lines,
    subtotalCents,
    estimatedTotal: formatDirectOrderPrice(subtotalCents),
  };
}

export function facetValue(offering: DirectOrderOffering, key: string) {
  return (
    offering.facets.find((facet) => facet.facetKey === key)?.facetValue ?? null
  );
}

export function facetLabel(offering: DirectOrderOffering, key: string) {
  return offering.facets.find((facet) => facet.facetKey === key)?.label ?? null;
}

export function matchesDirectOrderFilters({
  offering,
  search,
  activeFilter,
}: {
  offering: DirectOrderOffering;
  search: string;
  activeFilter: string;
}) {
  const normalized = search.trim().toLowerCase();
  const haystack = [
    offering.name,
    offering.shortSummary,
    offering.groupLabel,
    offering.tierLabel,
    ...offering.facets.flatMap((facet) => [facet.label, facet.facetValue]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (normalized && !haystack.includes(normalized)) return false;
  if (activeFilter === "all") return true;
  return [
    offering.tierLabel?.toLowerCase(),
    ...offering.facets.map((facet) => facet.facetValue),
  ].includes(activeFilter);
}

const diaryTierOrder = ["easy", "medium", "hard", "elite"] as const;

export function diaryPrerequisiteSlugs(
  offerings: readonly DirectOrderOffering[],
  selectedOffering: DirectOrderOffering,
) {
  if (facetValue(selectedOffering, "dependency-behavior") !== "auto-include") {
    return [];
  }
  const region = facetValue(selectedOffering, "region");
  const selectedTier = facetValue(selectedOffering, "tier");
  const selectedIndex = diaryTierOrder.indexOf(
    selectedTier as (typeof diaryTierOrder)[number],
  );
  if (!region || selectedIndex <= 0) return [];
  return offerings
    .filter((offering) => {
      if (facetValue(offering, "region") !== region) return false;
      const index = diaryTierOrder.indexOf(
        facetValue(offering, "tier") as (typeof diaryTierOrder)[number],
      );
      return index >= 0 && index < selectedIndex;
    })
    .map((offering) => offering.slug);
}
