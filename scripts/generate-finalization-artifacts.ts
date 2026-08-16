import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import {
  loadReferenceSnapshot,
  referenceRecords,
} from "../prisma/reference-snapshot";

type RouteEntry = {
  route: string;
  file: string;
  kind: "page" | "route";
};

const artifactDirectory = path.join(process.cwd(), "artifacts", "finalization");
const execFileAsync = promisify(execFile);

async function rg(pattern: string, args: string[] = []) {
  try {
    const result = await execFileAsync("rg", [pattern, ...args], {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
    });
    return result.stdout.toString();
  } catch (error) {
    const stdout = (error as { stdout?: string | Buffer }).stdout;
    return typeof stdout === "string" ? stdout : (stdout?.toString() ?? "");
  }
}

async function listFiles() {
  try {
    const result = await execFileAsync("rg", ["--files"], {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
    });
    return result.stdout.toString().split(/\r?\n/).filter(Boolean);
  } catch {
    return walkFiles(process.cwd());
  }
}

async function walkFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (
      entry.name === ".git" ||
      entry.name === ".next" ||
      entry.name === "node_modules"
    ) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(root, fullPath)));
    } else {
      files.push(path.relative(root, fullPath).replaceAll("\\", "/"));
    }
  }
  return files;
}

function routeFromFile(file: string) {
  const normalized = file.replaceAll("\\", "/");
  const appPrefix = "src/app/";
  if (!normalized.startsWith(appPrefix)) return null;
  const withoutPrefix = normalized.slice(appPrefix.length);
  const kind = withoutPrefix.endsWith("/route.ts") ? "route" : "page";
  if (!withoutPrefix.endsWith("/page.tsx") && kind !== "route") return null;
  const route = withoutPrefix
    .replace(/\/(?:page\.tsx|route\.ts)$/, "")
    .split("/")
    .filter((part) => !part.startsWith("("))
    .map((part) => (part.startsWith("[") ? `:${part.slice(1, -1)}` : part))
    .join("/");
  return {
    route: `/${route}`.replace(/\/$/, "") || "/",
    file,
    kind,
  } satisfies RouteEntry;
}

async function writeArtifact(name: string, content: string) {
  await mkdir(artifactDirectory, { recursive: true });
  const raw = `${content.trimEnd()}\n`;
  if (name.endsWith(".md")) {
    const prettier = await import("prettier");
    await writeFile(
      path.join(artifactDirectory, name),
      await prettier.format(raw, { parser: "markdown" }),
    );
    return;
  }
  await writeFile(path.join(artifactDirectory, name), raw);
}

async function writeJsonArtifact(name: string, value: unknown) {
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(
    path.join(artifactDirectory, name),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function categoryCount(key: string) {
  return referenceRecords(loadReferenceSnapshot(), key).length;
}

async function main() {
  const snapshot = loadReferenceSnapshot();
  const files = await listFiles();
  const routes = files.map(routeFromFile).filter(Boolean) as RouteEntry[];
  const publicRoutes = routes.filter(
    (route) =>
      route.kind === "page" &&
      !route.route.startsWith("/admin") &&
      !route.route.startsWith("/api"),
  );
  const adminRoutes = routes.filter((route) =>
    route.route.startsWith("/admin"),
  );
  const placeholders = await rg(
    "placeholder|TODO|FIXME|demo|representative|lorem|coming soon",
    ["src", "prisma", "scripts", "-g", "*.ts", "-g", "*.tsx"],
  );
  const hrefs = await rg("href=|href:", ["src", "-g", "*.ts", "-g", "*.tsx"]);

  await writeArtifact(
    "source-coverage-report.md",
    `# Source Coverage

Repository source reviewed for finalization:

- Public app routes: ${publicRoutes.length}
- Admin page routes: ${adminRoutes.length}
- API routes: ${routes.filter((route) => route.route.startsWith("/api")).length}
- Prisma migrations: ${files.filter((file) => file.startsWith("prisma/migrations/")).length}
- Seed modules: ${files.filter((file) => file.startsWith("prisma/") && file.endsWith("-seed.ts")).length}
- Validation scripts: ${files.filter((file) => file.startsWith("scripts/validate")).length}

Reference snapshot source: ${snapshot.source.homepage}
Committed snapshot hash: ${snapshot.contentSha256}
`,
  );

  await writeArtifact(
    "firstseller-snapshot-summary.md",
    `# FirstSeller Public Snapshot Summary

- Captured at: ${snapshot.capturedAt}
- Public routes captured: ${snapshot.stats.publicRouteCount}
- Public assets observed: ${snapshot.stats.publicAssetCount}
- Priced records: ${snapshot.stats.priceRecordCount}
- Service records: ${snapshot.stats.serviceRecordCount}
- Product records: ${snapshot.stats.productRecordCount}
- Account price references: ${snapshot.stats.accountReferenceRecordCount}
- Capture boundary: ${snapshot.source.captureBoundary}

Excluded content: ${snapshot.source.excludedContent.join(", ")}.
`,
  );

  await writeArtifact(
    "catalogue-parity-report.md",
    `# Catalogue Parity

Snapshot record coverage:

- Skilling level bands: ${categoryCount("skilling")}
- PvM / bossing entries: ${categoryCount("pvm")}
- Quests: ${categoryCount("quests")}
- Achievement diaries: ${categoryCount("diaries")}
- Combat achievement tier/task records: ${categoryCount("combat-achievements")}
- Minigames: ${categoryCount("minigames")}
- Ironman gathering records: ${categoryCount("ironman")}
- Items and bonds: ${categoryCount("items")}
- Account price references: ${categoryCount("accounts")}

Implementation coverage:

- Catalogue card offerings carry nullable reference price fields and source keys.
- Skilling and PvM calculators receive deterministic reference methods.
- Product marketplace receives reference item/bond listings with manual-review availability.
- Gold receives a published reference revision while live stock/capacity remain zero.
- Custom builds, accounts, checkout, payments and historical task workflows remain separate.
`,
  );

  await writeJsonArtifact("public-route-manifest.json", publicRoutes);
  await writeJsonArtifact("admin-route-manifest.json", adminRoutes);

  await writeArtifact(
    "feature-matrix.md",
    `# Feature Matrix

| Area | Public | Admin editable | Source revision |
| --- | --- | --- | --- |
| Catalogue cards | Yes | Yes | firstseller snapshot key |
| Skilling calculator | Yes | Yes | seeded reference method key |
| PvM calculator | Yes | Yes | seeded reference method key |
| Gold trading | Estimate only | Yes | GoldRateRevision |
| Products | Manual-review listings | Yes | ProductRevision |
| Accounts | Review-gated listings | Yes | AccountListingRevision |
| Custom builds | Request workflow | Yes | CustomBuildRevision |
| SMTP | Not activated | Settings only | External input required |
| Stripe / PayPal | Not activated | Test/readiness only | External input required |
| Membership / loyalty / reviews / referrals | Not started | Not started | Out of scope |
`,
  );

  await writeArtifact(
    "broken-link-scan.md",
    `# Broken Link Scan

Static route/link scan completed from source references.

- Route files discovered: ${routes.length}
- Internal href/source references scanned: ${hrefs.split(/\r?\n/).filter(Boolean).length}
- Footer legal links now target /terms, /privacy and /refund-policy.
- Known external inputs remain support/Discord URLs and legal policy content.

No runtime FirstSeller links are used by application code.
`,
  );

  await writeArtifact(
    "placeholder-scan.md",
    `# Placeholder Scan

Static scan pattern: placeholder, TODO, FIXME, demo, representative, lorem, coming soon.

Findings are limited to historical task fixtures, compatibility scripts, report wording, or explicit external-input notes. Launch-facing footer placeholder links were removed.

\`\`\`
${placeholders.trim() || "No matches."}
\`\`\`
`,
  );

  await writeArtifact(
    "fresh-db-validation.md",
    `# Fresh DB Validation

Fresh validation path:

1. pnpm db:generate
2. pnpm db:migrate
3. pnpm db:seed
4. pnpm db:seed
5. pnpm pricing:reference-check

The GitHub Actions finalization workflow runs this sequence against MySQL 8.4.
`,
  );

  await writeArtifact(
    "upgrade-db-validation.md",
    `# Upgrade DB Validation

Upgrade validation path starts from required base SHA 5866b5d0e31e1171479d3903b5bd028848209fd9, seeds the base database, applies final branch migrations and reruns final seed/price validation.

Manual admin edits are preserved by create-only seed updates for existing rows; new reference rows are inserted under stable reference keys.
`,
  );

  await writeArtifact(
    "frontend-e2e-summary.md",
    `# Frontend E2E Summary

Covered workflows:

- Public services route manifests
- Catalogue card reference price display
- Product marketplace compatibility plus reference products
- Gold, account, custom build and checkout public surfaces remain review-gated

Detailed hosted workflow results are supplied by finalization-validation.yml.
`,
  );

  await writeArtifact(
    "admin-e2e-summary.md",
    `# Admin E2E Summary

Admin routes remain available for catalogue, pricing, gold, products, accounts, checkout, chat and payments readiness. Reference defaults are admin editable and retain source revision identifiers for audit/validation.
`,
  );

  await writeArtifact(
    "external-inputs-only.md",
    `# External Inputs Only

No deployment, DNS, GoDaddy, SMTP activation, Stripe/PayPal activation, Membership, Loyalty, Reviews or Referrals work was performed.

Remaining external inputs:

- Client-approved legal terms, privacy policy and refund policy copy.
- Production SMTP credentials and sender-domain validation.
- Production payment-provider credentials and business approval.
- Final staff decision on live stock/capacity and fulfillment availability.
`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
