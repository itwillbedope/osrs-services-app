import "server-only";

import { access, mkdir } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";
import { emailTransportConfiguration } from "@/lib/email/transport";
import { env } from "@/lib/env";

export type ReadinessPayload = {
  status: "ready" | "not_ready";
  service: "osrs-services-app";
  checks: {
    app: "ok";
    database: "reachable" | "unreachable";
    migrations: "present" | "unknown";
    emailConfigured: boolean;
    paymentProviderConfigured: boolean;
    chatConfigured: boolean;
    storageWritable: boolean;
  };
};

async function databaseReachable() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function migrationStatus() {
  try {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE migration_name = '20260810150000_task016_payments_launch_readiness'
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function storageWritable() {
  try {
    const root = path.resolve(
      process.cwd(),
      env.CUSTOM_BUILD_PRIVATE_ATTACHMENT_ROOT,
    );
    await mkdir(root, { recursive: true });
    await access(root);
    return true;
  } catch {
    return false;
  }
}

export async function createReadinessPayload(): Promise<ReadinessPayload> {
  const [database, migrations, storage, providerCount] = await Promise.all([
    databaseReachable(),
    migrationStatus(),
    storageWritable(),
    prisma.paymentProviderConfiguration
      .count({
        where: {
          provider: env.PAYMENT_PROVIDER,
          enabled: true,
        },
      })
      .catch(() => 0),
  ]);
  const emailConfig = emailTransportConfiguration();
  const chatConfigured = env.CHAT_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .every((origin) => origin !== "*");
  const checks = {
    app: "ok" as const,
    database: database ? ("reachable" as const) : ("unreachable" as const),
    migrations: migrations ? ("present" as const) : ("unknown" as const),
    emailConfigured:
      emailConfig.enabled &&
      (emailConfig.transport === "TEST_EMAIL" || emailConfig.smtpConfigured),
    paymentProviderConfigured:
      env.PAYMENT_PROVIDER === "MANUAL_REVIEW" || providerCount > 0,
    chatConfigured,
    storageWritable: storage,
  };
  const ready =
    checks.database === "reachable" &&
    checks.migrations === "present" &&
    checks.storageWritable;
  return {
    status: ready ? "ready" : "not_ready",
    service: "osrs-services-app",
    checks,
  };
}
