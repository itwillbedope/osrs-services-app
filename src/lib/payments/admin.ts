import "server-only";

import { z } from "zod";

import type { PaymentEligibilityMode } from "@/generated/prisma/client";
import { normalizePlainText } from "@/lib/checkout/security";
import { prisma } from "@/lib/db/prisma";

export const eligibilityUpdateSchema = z.object({
  id: z.string().trim().min(1).max(30),
  mode: z.enum([
    "MANUAL_ONLY",
    "PROVIDER_ALLOWED",
    "PROVIDER_REVIEW_REQUIRED",
    "DISABLED",
  ]),
  safeReason: z.unknown(),
  merchantConfirmed: z.boolean(),
  needsClientReview: z.boolean(),
  expectedVersion: z.coerce.number().int().min(1),
});

export async function getAdminPaymentTransactions() {
  return prisma.paymentTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          paymentStatus: true,
          status: true,
        },
      },
      refunds: { select: { status: true, amountMinor: true } },
    },
  });
}

export async function getAdminPaymentTransaction(transactionId: string) {
  return prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    include: {
      order: {
        include: {
          guestContact: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      events: { orderBy: { sequence: "asc" } },
      webhookEvents: { orderBy: { receivedAt: "desc" } },
      refunds: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getPaymentEligibilityRules() {
  return prisma.paymentEligibilityRule.findMany({
    orderBy: [{ sourceType: "asc" }, { sourceLabel: "asc" }],
    take: 500,
  });
}

export async function getPaymentProviderConfigurations() {
  return prisma.paymentProviderConfiguration.findMany({
    orderBy: [{ provider: "asc" }, { displayName: "asc" }],
    include: {
      checkoutMethods: {
        select: {
          stableKey: true,
          publicName: true,
          enabled: true,
          methodType: true,
        },
      },
    },
  });
}

export async function getLaunchReadinessSettings() {
  return prisma.productionReadinessSetting.findMany({
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });
}

export async function updatePaymentEligibilityRule(input: {
  id: string;
  mode: PaymentEligibilityMode;
  safeReason: unknown;
  merchantConfirmed: boolean;
  needsClientReview: boolean;
  expectedVersion: number;
  actorId: string;
}) {
  const updated = await prisma.paymentEligibilityRule.updateMany({
    where: { id: input.id, concurrencyVersion: input.expectedVersion },
    data: {
      mode: input.mode,
      safeReason: normalizePlainText(input.safeReason, 500),
      merchantConfirmed: input.merchantConfirmed,
      confirmedAt: input.merchantConfirmed ? new Date() : null,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
      needsClientReview: input.needsClientReview,
      concurrencyVersion: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    throw new Error("Payment eligibility changed before save.");
  }
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: "payments.eligibility.updated",
      targetType: "PaymentEligibilityRule",
      targetId: input.id,
      metadata: {
        mode: input.mode,
        merchantConfirmed: input.merchantConfirmed,
        needsClientReview: input.needsClientReview,
      },
    },
  });
}

export async function paymentFeatureFlagSummary() {
  const keys = [
    "external_payments_enabled",
    "payment_webhooks_enabled",
    "payment_refunds_enabled",
    "cart_enabled",
    "guest_checkout_enabled",
    "customer_accounts_enabled",
    "live_chat_enabled",
  ];
  const flags = await prisma.featureFlag.findMany({
    where: { key: { in: keys } },
    select: { key: true, enabled: true },
  });
  return new Map(flags.map((flag) => [flag.key, flag.enabled]));
}
