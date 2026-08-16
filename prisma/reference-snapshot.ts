import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export type ReferenceRecord = {
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

export type ReferenceCategory = {
  key: string;
  name: string;
  sourceUrl: string;
  status: "SOURCE_CAPTURED";
  records: ReferenceRecord[];
};

export type FirstSellerReferenceSnapshot = {
  schemaVersion: 1;
  capturedAt: string;
  source: {
    site: string;
    homepage: string;
    sitemap: string;
    robots: string;
    publicAssetManifest: string;
    publicCatalogueAsset: string;
    captureBoundary: string;
    excludedContent: string[];
  };
  publicRoutes: string[];
  publicAssetsUsed: string[];
  captureIntegrity: Record<string, unknown>;
  categories: ReferenceCategory[];
  stats: {
    categoryCount: number;
    publicRouteCount: number;
    publicAssetCount: number;
    serviceRecordCount: number;
    productRecordCount: number;
    accountReferenceRecordCount: number;
    priceRecordCount: number;
    unavailablePages: string[];
  };
  contentSha256: string;
};

let cachedSnapshot: FirstSellerReferenceSnapshot | null = null;

export function loadReferenceSnapshot() {
  if (cachedSnapshot) return cachedSnapshot;
  const snapshotPath = path.resolve(
    process.cwd(),
    "data/reference/firstseller-catalogue-snapshot.json",
  );
  cachedSnapshot = JSON.parse(
    readFileSync(snapshotPath, "utf8"),
  ) as FirstSellerReferenceSnapshot;
  return cachedSnapshot;
}

export function referenceCategory(
  snapshot: FirstSellerReferenceSnapshot,
  key: string,
) {
  const category = snapshot.categories.find((item) => item.key === key);
  if (!category) throw new Error(`Missing reference category: ${key}`);
  return category;
}

export function referenceRecords(
  snapshot: FirstSellerReferenceSnapshot,
  categoryKey: string,
  recordType?: string,
) {
  const records = referenceCategory(snapshot, categoryKey).records;
  return recordType
    ? records.filter((record) => record.recordType === recordType)
    : records;
}

export function findReferenceRecord(
  snapshot: FirstSellerReferenceSnapshot,
  categoryKey: string,
  recordType: string,
  slug: string,
) {
  return referenceRecords(snapshot, categoryKey, recordType).find(
    (record) => record.slug === slug,
  );
}

export function requireReferenceRecord(
  snapshot: FirstSellerReferenceSnapshot,
  categoryKey: string,
  recordType: string,
  slug: string,
) {
  const record = findReferenceRecord(snapshot, categoryKey, recordType, slug);
  if (!record) {
    throw new Error(
      `Missing reference record: ${categoryKey}/${recordType}/${slug}`,
    );
  }
  return record;
}

export function stableReferenceKey(
  categoryKey: string,
  record: Pick<ReferenceRecord, "recordType" | "slug">,
) {
  return stableKey(
    "firstseller",
    [categoryKey, record.recordType, record.slug],
    160,
  );
}

export function stableKey(prefix: string, parts: string[], maxLength: number) {
  const cleaned = [prefix, ...parts.map(slugify)].filter(Boolean).join(":");
  if (cleaned.length <= maxLength) return cleaned;
  const digest = createHash("sha256")
    .update(cleaned)
    .digest("hex")
    .slice(0, 10);
  const head = cleaned.slice(0, Math.max(1, maxLength - digest.length - 1));
  return `${head}:${digest}`;
}

export function stableId(prefix: string, value: string, maxLength = 30) {
  const digest = createHash("sha256").update(value).digest("hex");
  const cleanedPrefix = slugify(prefix).replace(/-/g, "").slice(0, 10);
  return `${cleanedPrefix}${digest}`.slice(0, maxLength);
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "record"
  );
}

export function numberField(record: ReferenceRecord, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
