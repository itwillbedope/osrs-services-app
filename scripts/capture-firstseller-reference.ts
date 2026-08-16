import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type SourceRecord = {
  category: string;
  subcategory: string | null;
  recordType: string;
  slug: string;
  name: string;
  sourceUrl: string;
  currency: "USD";
  displayedBasePrice: number;
  priceCents: number;
  pricingUnit: string | null;
  [key: string]: unknown;
};

type SnapshotCategory = {
  key: string;
  name: string;
  sourceUrl: string;
  status: "SOURCE_CAPTURED";
  records: SourceRecord[];
};

type SkillingBand = {
  skill: string;
  minLevel: number;
  maxLevel: number;
  method: string;
  gpPerXp: number;
  usdPerXp: number;
};

type PvmRecord = {
  slug: string;
  name: string;
  pricePerKill: number;
};

type QuestRecord = {
  slug: string;
  name: string;
  category: string;
  qp: number;
  price: number;
};

type MinigameRecord = {
  slug: string;
  name: string;
  category: string;
  priceTier?: string;
  price: number;
  unitLabel?: string;
};

type DiaryRecord = {
  slug: string;
  name: string;
  area: string;
  tier: string;
  price: number;
};

type CombatTierRecord = {
  slug: string;
  name: string;
  tier: string;
  points: number;
  price: number;
};

type CombatTaskRecord = {
  id: string;
  monster?: string;
  name: string;
  type: string;
  price: number;
  sourceProductId?: number;
  priceSource?: string;
};

type IronmanRecord = {
  slug: string;
  sourceId: number;
  name: string;
  category: string;
  baseQuantity?: number;
  unitLabel?: string;
  price: number;
};

type ItemRecord = {
  slug: string;
  name: string;
  category: string;
  price: number;
  gpPrice?: number;
  quantity?: number;
};

type AccountRecord = {
  slug: string;
  name: string;
  type: string;
  price: number;
};

type CatalogueExports = {
  A: SkillingBand[];
  b: PvmRecord[];
  e: QuestRecord[];
  f: MinigameRecord[];
  j: DiaryRecord[];
  l: CombatTierRecord[];
  r: CombatTaskRecord[];
  o: IronmanRecord[];
  u: ItemRecord[];
  t: AccountRecord[];
};

const sourceSite = "https://firstseller.shop";
const currency = "USD" as const;
const routeFor = {
  gold: `${sourceSite}/services/gold`,
  accounts: `${sourceSite}/services/accounts`,
  skilling: `${sourceSite}/services/skilling`,
  pvm: `${sourceSite}/services/pvm`,
  quests: `${sourceSite}/services/quests`,
  minigames: `${sourceSite}/services/minigames`,
  diaries: `${sourceSite}/services/diaries`,
  "combat-achievements": `${sourceSite}/services/combat-achievements`,
  ironman: `${sourceSite}/services/ironman-gathering`,
  items: `${sourceSite}/services/items`,
};

function cents(amount: number) {
  return Math.round((Number(amount) + Number.EPSILON) * 100);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "record"
  );
}

function moneyRecord({
  category,
  subcategory = null,
  recordType,
  slug,
  name,
  price,
  unit = null,
  sourceUrl,
  extra = {},
}: {
  category: string;
  subcategory?: string | null;
  recordType: string;
  slug: string;
  name: string;
  price: number;
  unit?: string | null;
  sourceUrl: string;
  extra?: Record<string, unknown>;
}): SourceRecord {
  return {
    category,
    subcategory,
    recordType,
    slug,
    name,
    sourceUrl,
    currency,
    displayedBasePrice: Number(price),
    priceCents: cents(price),
    pricingUnit: unit,
    ...extra,
  };
}

async function getText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Codex finalization public reference capture; public pages only",
    },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function parseCatalogueExports(catalogueJs: string): CatalogueExports {
  const exportMatch = catalogueJs.match(
    /export\{([^}]+)\};\n\/\/# sourceMappingURL=.*$/s,
  );
  if (!exportMatch || exportMatch.index == null || !exportMatch[1]) {
    throw new Error("Unable to parse public catalogue exports.");
  }
  const exportSpec = exportMatch[1];
  const returnObject = exportSpec
    .split(",")
    .map((part) => {
      const [local, alias] = part.split(" as ");
      if (!local || !alias) throw new Error(`Invalid export part: ${part}`);
      return `${JSON.stringify(alias)}:${local}`;
    })
    .join(",");
  return new Function(
    `${catalogueJs.slice(0, exportMatch.index)}; return {${returnObject}};`,
  )() as CatalogueExports;
}

function parseGoldDefaults(mainJs: string) {
  const match = mainJs.match(
    /const Fc=([^,]+),Bc=([^,]+),qc=([^,]+),Vc=([^,]+),Hc=([^,]+),/,
  );
  if (!match) throw new Error("Unable to parse public gold defaults.");
  return {
    buyRate: Number(match[1]),
    sellRate: Number(match[2]),
    buyMinimumMillions: Number(match[3]),
    sellMinimumMillions: Number(match[4]),
    maximumMillions: Number(match[5]),
  };
}

async function main() {
  const capturedAt = new Date().toISOString();
  const mainAsset = "assets/index-D8NQCNia.js";
  const catalogueAsset = "assets/catalogClient-CrEthluT.js";
  const [robotsTxt, sitemapXml, homeHtml, mainJs, catalogueJs] =
    await Promise.all([
      getText(`${sourceSite}/robots.txt`),
      getText(`${sourceSite}/sitemap.xml`),
      getText(`${sourceSite}/`),
      getText(`${sourceSite}/${mainAsset}`),
      getText(`${sourceSite}/${catalogueAsset}`),
    ]);

  const publicRoutes = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1]!,
  );
  const publicAssets = [
    ...new Set(
      [...mainJs.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map(
        (match) => match[0]!,
      ),
    ),
  ].sort();
  const catalogue = parseCatalogueExports(catalogueJs);
  const goldDefaults = parseGoldDefaults(mainJs);

  const categories: SnapshotCategory[] = [
    {
      key: "gold",
      name: "Gold",
      sourceUrl: routeFor.gold,
      status: "SOURCE_CAPTURED",
      records: [
        moneyRecord({
          category: "gold",
          recordType: "gold-rate",
          slug: "buy-osrs-gold",
          name: "Buy OSRS Gold",
          price: goldDefaults.buyRate,
          unit: "per 1M GP",
          sourceUrl: routeFor.gold,
          extra: {
            direction: "CUSTOMER_BUYS_GOLD",
            minimumQuantityM: goldDefaults.buyMinimumMillions,
            maximumQuantityM: goldDefaults.maximumMillions,
          },
        }),
        moneyRecord({
          category: "gold",
          recordType: "gold-rate",
          slug: "sell-osrs-gold",
          name: "Sell OSRS Gold",
          price: goldDefaults.sellRate,
          unit: "per 1M GP",
          sourceUrl: routeFor.gold,
          extra: {
            direction: "CUSTOMER_SELLS_GOLD",
            minimumQuantityM: goldDefaults.sellMinimumMillions,
            maximumQuantityM: goldDefaults.maximumMillions,
          },
        }),
      ],
    },
    {
      key: "skilling",
      name: "Skilling & Boosting",
      sourceUrl: routeFor.skilling,
      status: "SOURCE_CAPTURED",
      records: catalogue.A.filter((item) => item.skill !== "sailing").map(
        (item) =>
          moneyRecord({
            category: "skilling",
            subcategory: item.skill,
            recordType: "skilling-level-band",
            slug: `${item.skill}-${slugify(item.method)}-${item.minLevel}-${item.maxLevel}`,
            name: `${item.skill} ${item.minLevel}-${item.maxLevel} ${item.method}`,
            price: item.usdPerXp * 1_000_000,
            unit: "per 1M XP",
            sourceUrl: routeFor.skilling,
            extra: {
              skill: item.skill,
              method: item.method,
              levelRange: { minimum: item.minLevel, maximum: item.maxLevel },
              gpPerXp: item.gpPerXp,
              usdPerXp: item.usdPerXp,
            },
          }),
      ),
    },
    {
      key: "pvm",
      name: "PvM / Bossing",
      sourceUrl: routeFor.pvm,
      status: "SOURCE_CAPTURED",
      records: catalogue.b.map((item) =>
        moneyRecord({
          category: "pvm",
          recordType: "pvm-kill",
          slug: item.slug,
          name: item.name,
          price: item.pricePerKill,
          unit: "per kill",
          sourceUrl: routeFor.pvm,
        }),
      ),
    },
    {
      key: "quests",
      name: "Quests",
      sourceUrl: routeFor.quests,
      status: "SOURCE_CAPTURED",
      records: catalogue.e.map((item) =>
        moneyRecord({
          category: "quests",
          subcategory: item.category,
          recordType: "quest",
          slug: item.slug,
          name: item.name,
          price: item.price,
          unit: "quest completion",
          sourceUrl: routeFor.quests,
          extra: { questPoints: item.qp },
        }),
      ),
    },
    {
      key: "minigames",
      name: "Minigames",
      sourceUrl: routeFor.minigames,
      status: "SOURCE_CAPTURED",
      records: catalogue.f.map((item) =>
        moneyRecord({
          category: "minigames",
          subcategory: item.category,
          recordType: "minigame",
          slug: item.slug,
          name: item.name,
          price: item.price,
          unit: item.unitLabel || "completion",
          sourceUrl: routeFor.minigames,
          extra: { priceTier: item.priceTier ?? null },
        }),
      ),
    },
    {
      key: "diaries",
      name: "Achievement Diaries",
      sourceUrl: routeFor.diaries,
      status: "SOURCE_CAPTURED",
      records: catalogue.j.map((item) =>
        moneyRecord({
          category: "diaries",
          subcategory: item.tier,
          recordType: "achievement-diary",
          slug: item.slug,
          name: item.name,
          price: item.price,
          unit: "diary completion",
          sourceUrl: routeFor.diaries,
          extra: { area: item.area, tier: item.tier },
        }),
      ),
    },
    {
      key: "combat-achievements",
      name: "Combat Achievements",
      sourceUrl: routeFor["combat-achievements"],
      status: "SOURCE_CAPTURED",
      records: [
        ...catalogue.l.map((item) =>
          moneyRecord({
            category: "combat-achievements",
            subcategory: item.tier,
            recordType: "combat-achievement-tier",
            slug: item.slug,
            name: item.name,
            price: item.price,
            unit: "tier package",
            sourceUrl: routeFor["combat-achievements"],
            extra: { points: item.points, tier: item.tier },
          }),
        ),
        ...catalogue.r.map((item) =>
          moneyRecord({
            category: "combat-achievements",
            subcategory: item.type,
            recordType: "combat-achievement-task",
            slug: item.id,
            name:
              item.monster && item.monster !== "Combat Achievement"
                ? `${item.monster} - ${item.name}`
                : item.name,
            price: item.price,
            unit: "task",
            sourceUrl: routeFor["combat-achievements"],
            extra: {
              taskId: item.id,
              sourceProductId: item.sourceProductId ?? null,
              priceSource: item.priceSource ?? null,
            },
          }),
        ),
      ],
    },
    {
      key: "ironman",
      name: "Ironman Gathering",
      sourceUrl: routeFor.ironman,
      status: "SOURCE_CAPTURED",
      records: catalogue.o.map((item) =>
        moneyRecord({
          category: "ironman",
          subcategory: item.category,
          recordType: "ironman-gathering",
          slug: item.slug,
          name: item.name,
          price: item.price,
          unit: item.unitLabel || "order",
          sourceUrl: routeFor.ironman,
          extra: {
            sourceId: item.sourceId,
            baseQuantity: item.baseQuantity ?? null,
          },
        }),
      ),
    },
    {
      key: "items",
      name: "Items & Bonds",
      sourceUrl: routeFor.items,
      status: "SOURCE_CAPTURED",
      records: catalogue.u.map((item) =>
        moneyRecord({
          category: item.category === "bond" ? "bonds" : "items",
          subcategory: item.category,
          recordType: item.category === "bond" ? "bond" : "item",
          slug: item.slug,
          name: item.name,
          price: item.price,
          unit: item.quantity ? `quantity ${item.quantity}` : "unit",
          sourceUrl: routeFor.items,
          extra: {
            gpPrice: item.gpPrice ?? null,
            quantity: item.quantity ?? 1,
          },
        }),
      ),
    },
    {
      key: "accounts",
      name: "Accounts",
      sourceUrl: routeFor.accounts,
      status: "SOURCE_CAPTURED",
      records: catalogue.t.map((item) =>
        moneyRecord({
          category: "accounts",
          subcategory: item.type,
          recordType: "account-price-reference",
          slug: item.slug,
          name: item.name,
          price: item.price,
          unit: "account listing reference",
          sourceUrl: routeFor.accounts,
          extra: { accountType: item.type },
        }),
      ),
    },
  ];

  const priceRecordCount = categories.reduce(
    (total, category) =>
      total +
      category.records.filter((record) => Number.isInteger(record.priceCents))
        .length,
    0,
  );
  const serviceRecordCount = categories
    .filter((category) => !["items", "accounts"].includes(category.key))
    .reduce((total, category) => total + category.records.length, 0);
  const productRecordCount =
    categories.find((category) => category.key === "items")?.records.length ??
    0;

  const snapshot = {
    schemaVersion: 1,
    capturedAt,
    source: {
      site: sourceSite,
      homepage: `${sourceSite}/`,
      sitemap: `${sourceSite}/sitemap.xml`,
      robots: `${sourceSite}/robots.txt`,
      publicAssetManifest: `${sourceSite}/${mainAsset}`,
      publicCatalogueAsset: `${sourceSite}/${catalogueAsset}`,
      captureBoundary:
        "Public routes, public HTML, public sitemap, robots.txt and public static browser assets only.",
      excludedContent: [
        "logos",
        "page layouts",
        "CSS",
        "marketing descriptions",
        "images",
        "screenshots",
        "reviews",
        "testimonials",
        "private APIs",
        "authenticated data",
      ],
    },
    publicRoutes,
    publicAssetsUsed: [mainAsset, catalogueAsset],
    captureIntegrity: {
      robotsLength: robotsTxt.length,
      homepageLength: homeHtml.length,
      sitemapLength: sitemapXml.length,
      publicAssetCount: publicAssets.length,
    },
    categories,
    stats: {
      categoryCount: categories.length,
      publicRouteCount: publicRoutes.length,
      publicAssetCount: publicAssets.length,
      serviceRecordCount,
      productRecordCount,
      accountReferenceRecordCount:
        categories.find((category) => category.key === "accounts")?.records
          .length ?? 0,
      priceRecordCount,
      unavailablePages: [] as string[],
    },
    contentSha256: createHash("sha256")
      .update(JSON.stringify(categories))
      .digest("hex"),
  };

  const outputPath = path.join(
    process.cwd(),
    "data/reference/firstseller-catalogue-snapshot.json",
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify(snapshot.stats, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
