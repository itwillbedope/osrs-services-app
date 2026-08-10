import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createRuntimePrismaClient } from "../src/lib/db/runtime";

const prisma = createRuntimePrismaClient();
const outputDirectory = path.join(process.cwd(), "artifacts", "task-016");
const outputPath = path.join(
  outputDirectory,
  "task016-client-review-required.txt",
);

async function main() {
  const [
    providers,
    eligibilityReviewCount,
    eligibilityManualCount,
    templates,
    readiness,
    flags,
  ] = await Promise.all([
    prisma.paymentProviderConfiguration.findMany({
      orderBy: [{ provider: "asc" }, { displayName: "asc" }],
      select: {
        provider: true,
        displayName: true,
        enabled: true,
        productionAllowed: true,
        healthStatus: true,
        needsClientReview: true,
      },
    }),
    prisma.paymentEligibilityRule.count({
      where: { needsClientReview: true },
    }),
    prisma.paymentEligibilityRule.count({
      where: { mode: "MANUAL_ONLY" },
    }),
    prisma.emailTemplate.findMany({
      orderBy: [{ templateType: "asc" }, { version: "asc" }],
      select: {
        templateType: true,
        version: true,
        enabled: true,
        needsClientReview: true,
      },
    }),
    prisma.productionReadinessSetting.findMany({
      orderBy: [{ category: "asc" }, { label: "asc" }],
      select: {
        category: true,
        label: true,
        status: true,
        needsClientReview: true,
      },
    }),
    prisma.featureFlag.findMany({
      where: {
        key: {
          in: [
            "external_payments_enabled",
            "payment_webhooks_enabled",
            "payment_refunds_enabled",
            "guest_checkout_enabled",
            "customer_accounts_enabled",
            "live_chat_enabled",
          ],
        },
      },
      orderBy: { key: "asc" },
      select: { key: true, enabled: true },
    }),
  ]);

  const lines = [
    "Task 016 client review required",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "Payment provider activation",
    ...providers.map(
      (provider) =>
        `- ${provider.provider}: enabled=${provider.enabled}; productionAllowed=${provider.productionAllowed}; health=${provider.healthStatus}; needsReview=${provider.needsClientReview}`,
    ),
    "",
    "Payment eligibility",
    `- Rules needing merchant/client review: ${eligibilityReviewCount}`,
    `- Rules forced to manual review only: ${eligibilityManualCount}`,
    "- Gold, items, accounts, account-service and custom-build categories require processor approval before hosted checkout can be considered.",
    "",
    "Email templates",
    ...templates.map(
      (template) =>
        `- ${template.templateType} ${template.version}: enabled=${template.enabled}; needsReview=${template.needsClientReview}`,
    ),
    "",
    "Production readiness",
    ...readiness.map(
      (setting) =>
        `- ${setting.category} / ${setting.label}: ${setting.status}; needsReview=${setting.needsClientReview}`,
    ),
    "",
    "Feature flags",
    ...flags.map(
      (flag) => `- ${flag.key}: ${flag.enabled ? "enabled" : "disabled"}`,
    ),
    "",
    "Launch blockers",
    "- No real payment provider is approved or configured by this task.",
    "- No Stripe, PayPal, Apple Pay, Google Pay, Payoneer, cryptocurrency, OSRS GP automation or bank-transfer integration is activated.",
    "- Email delivery is disabled until SMTP sender configuration and template wording are client-reviewed.",
    "- Terms, privacy and refund-policy placeholder pages require client legal review before production launch.",
    "- Production launch requires environment review, migrations, backups, SSL/domain cutover and rollback planning.",
    "",
    "This report excludes secrets, SMTP passwords, provider credentials, raw tokens, raw webhook payloads, card data and real customer PII.",
    "",
  ];

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(lines.join("\n"));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
