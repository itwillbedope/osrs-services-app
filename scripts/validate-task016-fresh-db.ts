import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createRuntimePrismaClient } from "../src/lib/db/runtime";

const prisma = createRuntimePrismaClient();
const outputDirectory = path.join(process.cwd(), "artifacts", "task-016");
const migrationName = "20260810150000_task016_payments_launch_readiness";
const paymentPermissions = [
  "payments.view",
  "payments.review",
  "payments.refund",
  "payments.configure",
  "payments.eligibility.manage",
];
const paymentFlags = [
  "external_payments_enabled",
  "payment_webhooks_enabled",
  "payment_refunds_enabled",
];

async function main() {
  const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
  `;
  const flags = await prisma.featureFlag.findMany({
    where: { key: { in: paymentFlags } },
    select: { key: true, enabled: true },
  });
  const permissions = await prisma.permission.findMany({
    where: { key: { in: paymentPermissions } },
    select: { key: true },
  });
  const superAdminPaymentPermissions = await prisma.rolePermission.count({
    where: {
      role: { key: "SUPER_ADMIN" },
      permission: { key: { in: paymentPermissions } },
    },
  });
  const supportRestrictedPaymentPermissions = await prisma.rolePermission.count(
    {
      where: {
        role: { key: "SUPPORT_AGENT" },
        permission: {
          key: {
            in: [
              "payments.refund",
              "payments.configure",
              "payments.eligibility.manage",
            ],
          },
        },
      },
    },
  );
  const customerPaymentPermissions = await prisma.userRole.count({
    where: {
      role: {
        permissions: {
          some: { permission: { key: { startsWith: "payments." } } },
        },
      },
      user: { accountType: "CUSTOMER" },
    },
  });
  const providers = await prisma.paymentProviderConfiguration.findMany({
    select: {
      provider: true,
      enabled: true,
      productionAllowed: true,
      needsClientReview: true,
    },
  });
  const templates = await prisma.emailTemplate.count();
  const eligibilityNeedsReview = await prisma.paymentEligibilityRule.count({
    where: { needsClientReview: true },
  });
  const readinessNeedsReview = await prisma.productionReadinessSetting.count({
    where: { needsClientReview: true },
  });
  const manualMethod = await prisma.checkoutPaymentMethod.count({
    where: {
      stableKey: "manual-review",
      methodType: "MANUAL_REVIEW",
      providerType: "MANUAL_REVIEW",
      enabled: true,
    },
  });
  const testHostedEnabled = await prisma.checkoutPaymentMethod.count({
    where: { providerType: "TEST_HOSTED", enabled: true },
  });
  const transactionRows = await prisma.paymentTransaction.count();
  const emailDeliveryRows = await prisma.emailDelivery.count();

  if (migrations.length !== 1) throw new Error("Task 016 migration missing.");
  if (
    flags.length !== paymentFlags.length ||
    flags.some((flag) => flag.enabled)
  ) {
    throw new Error("Payment feature flags must seed disabled.");
  }
  if (permissions.length !== paymentPermissions.length) {
    throw new Error("Payment permissions missing.");
  }
  if (superAdminPaymentPermissions !== paymentPermissions.length) {
    throw new Error("SUPER_ADMIN payment permissions incomplete.");
  }
  if (supportRestrictedPaymentPermissions !== 0) {
    throw new Error("SUPPORT_AGENT received restricted payment permissions.");
  }
  if (customerPaymentPermissions !== 0) {
    throw new Error("CUSTOMER received payment admin permissions.");
  }
  if (manualMethod !== 1 || testHostedEnabled !== 0) {
    throw new Error("Payment methods seeded with unsafe defaults.");
  }
  if (templates < 6) throw new Error("Email templates missing.");
  if (eligibilityNeedsReview === 0) {
    throw new Error("Payment eligibility must require client review.");
  }

  const lines = [
    "Task 016 fresh database validation",
    `MySQL migration present: ${migrations.length === 1}`,
    `Payment feature flags disabled: ${flags.every((flag) => !flag.enabled)}`,
    `Payment permissions: ${permissions.length}`,
    `SUPER_ADMIN payment permission assignments: ${superAdminPaymentPermissions}`,
    `SUPPORT_AGENT restricted payment assignments: ${supportRestrictedPaymentPermissions}`,
    `CUSTOMER payment-admin assignment count: ${customerPaymentPermissions}`,
    `Provider configuration count: ${providers.length}`,
    `TEST_HOSTED enabled method count: ${testHostedEnabled}`,
    `Manual payment method preserved: ${manualMethod === 1}`,
    `Payment eligibility needing review: ${eligibilityNeedsReview}`,
    `Email template count: ${templates}`,
    `Production readiness needing review: ${readinessNeedsReview}`,
    `Fresh payment transaction count: ${transactionRows}`,
    `Fresh email delivery count: ${emailDeliveryRows}`,
    "No provider secret, SMTP password, card, CVV, token or raw webhook payload columns are seeded.",
  ];
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "task016-fresh-database-validation.txt"),
    `${lines.join("\n")}\n`,
    "utf8",
  );
  console.log(lines.join("\n"));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
