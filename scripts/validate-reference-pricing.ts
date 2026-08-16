import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import mariadb, { type Connection } from "mariadb";

import {
  loadReferenceSnapshot,
  referenceRecords,
  stableKey,
  stableReferenceKey,
  type ReferenceRecord,
} from "../prisma/reference-snapshot";

type Row = Record<string, unknown>;

type Issue = {
  scope: string;
  key: string;
  expected: string;
  actual: string;
};

type GoldRateRow = {
  direction: unknown;
  rateMinorUnitsPerMillion: unknown;
};

const artifactDirectory = path.join(process.cwd(), "artifacts", "finalization");
const reportPath = path.join(artifactDirectory, "pricing-parity-report.txt");

const skillKeyByReferenceName = new Map(
  [
    "attack",
    "strength",
    "defence",
    "ranged",
    "prayer",
    "magic",
    "runecraft",
    "construction",
    "hitpoints",
    "agility",
    "herblore",
    "thieving",
    "crafting",
    "fletching",
    "slayer",
    "hunter",
    "mining",
    "smithing",
    "fishing",
    "cooking",
    "firemaking",
    "woodcutting",
    "farming",
  ].map((name) => [name, name.toUpperCase()]),
);

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

function optionalDatabaseConfigured() {
  return Boolean(
    process.env.DATABASE_USER &&
    process.env.DATABASE_PASSWORD &&
    process.env.DATABASE_NAME,
  );
}

async function connect() {
  return mariadb.createConnection({
    host: process.env.DATABASE_HOST ?? "127.0.0.1",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: env("DATABASE_USER"),
    password: env("DATABASE_PASSWORD"),
    database: env("DATABASE_NAME"),
    allowPublicKeyRetrieval:
      process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === "true",
  });
}

async function query<T extends Row>(connection: Connection, sql: string) {
  return (await connection.query(sql)) as T[];
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function referenceProductStableKey(record: ReferenceRecord) {
  return stableKey("reference-product", [record.recordType, record.slug], 120);
}

function referenceProductVariantStableKey(record: ReferenceRecord) {
  return stableKey(
    "reference-product-variant",
    [record.recordType, record.slug],
    160,
  );
}

function referenceSkillingMethodKey(record: ReferenceRecord) {
  const skillKey =
    typeof record.subcategory === "string"
      ? skillKeyByReferenceName.get(record.subcategory.toLowerCase())
      : undefined;
  if (!skillKey) return null;
  return stableKey("skill-training-reference", [skillKey, record.slug], 160);
}

function referenceBossingMethodKey(record: ReferenceRecord) {
  return stableKey(
    "pvm-support-reference-method",
    [record.slug, "standard-kills"],
    180,
  );
}

function compare(
  issues: Issue[],
  scope: string,
  key: string,
  expected: number,
  actual: unknown,
) {
  const actualNumber = asNumber(actual);
  if (actualNumber !== expected) {
    issues.push({
      scope,
      key,
      expected: `${expected}`,
      actual: `${actualNumber}`,
    });
  }
}

function parseJson(value: unknown) {
  if (typeof value === "string") return JSON.parse(value);
  return value as { rates?: Array<Row> };
}

async function validateDatabase(connection: Connection) {
  const snapshot = loadReferenceSnapshot();
  const issues: Issue[] = [];
  let matched = 0;

  const catalogueExpected = new Map<string, ReferenceRecord>();
  for (const categoryKey of [
    "quests",
    "diaries",
    "combat-achievements",
    "minigames",
    "ironman",
  ]) {
    for (const record of referenceRecords(snapshot, categoryKey)) {
      catalogueExpected.set(stableReferenceKey(categoryKey, record), record);
    }
  }
  const catalogueRows = await query<{
    referenceSourceKey: string;
    basePriceCents: number;
  }>(
    connection,
    "SELECT referenceSourceKey, basePriceCents FROM CatalogueOffering WHERE referenceSourceKey IS NOT NULL",
  );
  const catalogueByKey = new Map(
    catalogueRows.map((row) => [row.referenceSourceKey, row]),
  );
  for (const [key, record] of catalogueExpected) {
    const row = catalogueByKey.get(key);
    if (!row) {
      issues.push({
        scope: "catalogue offering",
        key,
        expected: `${record.priceCents}`,
        actual: "missing",
      });
      continue;
    }
    compare(
      issues,
      "catalogue offering",
      key,
      record.priceCents,
      row.basePriceCents,
    );
    matched += 1;
  }

  const productRows = await query<{
    productStableKey: string;
    variantStableKey: string;
    baseUnitPriceCents: number;
  }>(
    connection,
    `SELECT product.stableKey AS productStableKey,
            variant.stableKey AS variantStableKey,
            variant.baseUnitPriceCents AS baseUnitPriceCents
       FROM Product product
       INNER JOIN ProductVariant variant ON variant.productId = product.id
      WHERE product.stableKey LIKE 'reference-product:%'`,
  );
  const productByVariant = new Map(
    productRows.map((row) => [row.variantStableKey, row]),
  );
  for (const record of referenceRecords(snapshot, "items")) {
    const productStableKey = referenceProductStableKey(record);
    const variantStableKey = referenceProductVariantStableKey(record);
    const row = productByVariant.get(variantStableKey);
    if (!row || row.productStableKey !== productStableKey) {
      issues.push({
        scope: "product variant",
        key: variantStableKey,
        expected: `${record.priceCents}`,
        actual: "missing",
      });
      continue;
    }
    compare(
      issues,
      "product variant",
      variantStableKey,
      record.priceCents,
      row.baseUnitPriceCents,
    );
    matched += 1;
  }

  const skillingRows = await query<{
    seededKey: string;
    basePriceCentsPerMillionXp: number;
  }>(
    connection,
    "SELECT seededKey, basePriceCentsPerMillionXp FROM SkillingTrainingMethod WHERE seededKey LIKE 'skill-training-reference:%'",
  );
  const skillingByKey = new Map(
    skillingRows.map((row) => [row.seededKey, row]),
  );
  for (const record of referenceRecords(
    snapshot,
    "skilling",
    "skilling-level-band",
  )) {
    const key = referenceSkillingMethodKey(record);
    if (!key) continue;
    const row = skillingByKey.get(key);
    if (!row) {
      issues.push({
        scope: "skilling method",
        key,
        expected: `${record.priceCents}`,
        actual: "missing",
      });
      continue;
    }
    compare(
      issues,
      "skilling method",
      key,
      record.priceCents,
      row.basePriceCentsPerMillionXp,
    );
    matched += 1;
  }

  const bossingRows = await query<{
    seededKey: string;
    basePriceCentsPerKill: number;
  }>(
    connection,
    "SELECT seededKey, basePriceCentsPerKill FROM BossingMethod WHERE seededKey LIKE 'pvm-support-reference-method:%'",
  );
  const bossingByKey = new Map(bossingRows.map((row) => [row.seededKey, row]));
  for (const record of referenceRecords(snapshot, "pvm", "pvm-kill")) {
    const key = referenceBossingMethodKey(record);
    const row = bossingByKey.get(key);
    if (!row) {
      issues.push({
        scope: "bossing method",
        key,
        expected: `${record.priceCents}`,
        actual: "missing",
      });
      continue;
    }
    compare(
      issues,
      "bossing method",
      key,
      record.priceCents,
      row.basePriceCentsPerKill,
    );
    matched += 1;
  }

  const goldRows = await query<{ snapshot: unknown }>(
    connection,
    "SELECT snapshot FROM GoldRateRevision ORDER BY publishedAt DESC LIMIT 1",
  );
  const goldSnapshot = goldRows[0] ? parseJson(goldRows[0].snapshot) : null;
  const goldRates = new Map<string, GoldRateRow>(
    ((goldSnapshot?.rates ?? []) as GoldRateRow[]).map((rate) => [
      String(rate.direction),
      rate,
    ]),
  );
  for (const record of referenceRecords(snapshot, "gold", "gold-rate")) {
    const rate = goldRates.get(record.direction as string);
    if (!rate) {
      issues.push({
        scope: "gold revision",
        key: String(record.direction),
        expected: `${record.priceCents}`,
        actual: "missing",
      });
      continue;
    }
    compare(
      issues,
      "gold revision",
      String(record.direction),
      record.priceCents,
      rate.rateMinorUnitsPerMillion,
    );
    matched += 1;
  }

  return { snapshot, issues, matched };
}

async function writeReport(lines: string[]) {
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(reportPath, `${lines.join("\n").trimEnd()}\n`);
}

async function main() {
  const snapshot = loadReferenceSnapshot();
  if (!optionalDatabaseConfigured()) {
    await writeReport([
      "Reference pricing parity report",
      "Status: snapshot-only",
      `Snapshot captured: ${snapshot.capturedAt}`,
      `Price records: ${snapshot.stats.priceRecordCount}`,
      "Database environment was not configured; CI runs this check after migration and seeding.",
    ]);
    return;
  }

  const connection = await connect();
  try {
    const result = await validateDatabase(connection);
    const lines = [
      "Reference pricing parity report",
      `Snapshot captured: ${result.snapshot.capturedAt}`,
      `Snapshot hash: ${result.snapshot.contentSha256}`,
      `Matched rows: ${result.matched}`,
      `Issues: ${result.issues.length}`,
      "",
      ...result.issues.map(
        (issue) =>
          `${issue.scope}: ${issue.key} expected ${issue.expected} actual ${issue.actual}`,
      ),
    ];
    await writeReport(lines);
    console.log(lines.join("\n"));
    if (result.issues.length > 0) process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch(async (error: unknown) => {
  console.error(error);
  await writeReport([
    "Reference pricing parity report",
    "Status: failed",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  ]);
  process.exit(1);
});
