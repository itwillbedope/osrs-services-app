import "server-only";

import { createHash } from "node:crypto";

import type {
  PaymentProviderType,
  PaymentTransactionStatus,
  Prisma,
} from "@/generated/prisma/client";
import { hashIdempotencyKey } from "@/lib/checkout/security";
import { markOrderPaidInTransaction } from "@/lib/checkout/orders";
import { prisma } from "@/lib/db/prisma";
import { queueOrderEmailDelivery } from "@/lib/email/delivery";
import { adapterForProvider } from "@/lib/payments/adapters";
import { PAYMENT_WEBHOOKS_FEATURE_FLAG } from "@/lib/payments/constants";
import {
  assertPaymentAmountMatchesOrder,
  safePaymentMetadata,
  type HostedWebhookFixture,
} from "@/lib/payments/core";
import { PaymentError } from "@/lib/payments/eligibility";
import { transitionPaymentTransaction } from "@/lib/payments/transactions";

function safeJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function providerFromRoute(value: string): PaymentProviderType {
  const normalized = value.trim().toUpperCase().replace(/-/g, "_");
  if (
    normalized === "MANUAL_REVIEW" ||
    normalized === "TEST_HOSTED" ||
    normalized === "EXTERNAL_HOSTED_CHECKOUT"
  ) {
    return normalized;
  }
  throw new PaymentError("Unknown payment provider.", 404);
}

async function featureEnabled(key: string) {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true },
  });
  return Boolean(flag?.enabled);
}

function nextStatusForFixture(
  event: HostedWebhookFixture,
): PaymentTransactionStatus {
  if (event.status) return event.status;
  if (event.eventType === "payment.succeeded") return "PAID";
  if (event.eventType === "payment.cancelled") return "CANCELLED";
  if (event.eventType === "refund.succeeded") return "REFUNDED";
  return "FAILED";
}

export async function processPaymentWebhook(input: {
  providerRoute: string;
  payload: string;
  signature: string | null;
}) {
  const provider = providerFromRoute(input.providerRoute);
  const adapter = adapterForProvider(provider);
  const verification = await adapter.verifyWebhook({
    payload: input.payload,
    signature: input.signature,
  });
  if (!verification.ok || !verification.event) {
    await prisma.paymentWebhookEvent.upsert({
      where: {
        provider_eventIdHash: {
          provider,
          eventIdHash: digest(input.payload).slice(0, 64),
        },
      },
      create: {
        provider,
        eventIdHash: digest(input.payload).slice(0, 64),
        eventType: "unverified",
        status: "REJECTED",
        signatureHash: input.signature ? digest(input.signature) : null,
        failureCode: verification.failureCode ?? "INVALID_WEBHOOK",
        safePayload: safeJson({ verified: false }),
      },
      update: {
        status: "DUPLICATE",
        failureCode: verification.failureCode ?? "INVALID_WEBHOOK",
      },
    });
    throw new PaymentError("Payment webhook signature is invalid.", 401);
  }

  const event = await adapter.handleWebhookEvent({
    event: verification.event,
  });
  const eventIdHash = digest(event.eventId);
  const signatureHash = input.signature ? digest(input.signature) : null;
  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_eventIdHash: {
        provider,
        eventIdHash,
      },
    },
  });
  if (existing) {
    return { ok: true, duplicate: true, status: "DUPLICATE" as const };
  }

  const webhooksEnabled = await featureEnabled(PAYMENT_WEBHOOKS_FEATURE_FLAG);

  return prisma.$transaction(async (transaction) => {
    const webhook = await transaction.paymentWebhookEvent.create({
      data: {
        provider,
        eventIdHash,
        eventType: event.eventType,
        status: webhooksEnabled ? "VERIFIED" : "IGNORED",
        signatureHash,
        safePayload: safeJson(
          safePaymentMetadata({
            eventType: event.eventType,
            amountMinor: event.amountMinor,
            currency: event.currency,
            providerPaymentId: event.providerPaymentId ?? null,
            webhooksEnabled,
          }),
        ),
      },
    });
    if (!webhooksEnabled) {
      return { ok: true, duplicate: false, status: "IGNORED" as const };
    }

    const payment = await transaction.paymentTransaction.findUnique({
      where: { id: event.transactionId },
      include: {
        order: { include: { guestContact: { select: { email: true } } } },
      },
    });
    if (!payment || payment.provider !== provider) {
      await transaction.paymentWebhookEvent.update({
        where: { id: webhook.id },
        data: {
          status: "REJECTED",
          failureCode: "UNKNOWN_TRANSACTION",
          processedAt: new Date(),
        },
      });
      return { ok: true, duplicate: false, status: "REJECTED" as const };
    }

    try {
      assertPaymentAmountMatchesOrder({
        orderAmountMinor: payment.order.finalTotalCents,
        paymentAmountMinor: event.amountMinor,
        orderCurrency: payment.order.currencyCode,
        paymentCurrency: event.currency,
      });
    } catch (error) {
      await transaction.paymentWebhookEvent.update({
        where: { id: webhook.id },
        data: {
          status: "REJECTED",
          orderId: payment.orderId,
          transactionId: payment.id,
          failureCode:
            error instanceof Error ? error.message.slice(0, 120) : "MISMATCH",
          processedAt: new Date(),
        },
      });
      return { ok: true, duplicate: false, status: "REJECTED" as const };
    }

    const nextStatus = nextStatusForFixture(event);
    const transitioned = await transitionPaymentTransaction({
      transaction,
      payment,
      nextStatus,
      eventType: event.eventType.toUpperCase().replace(/\./g, "_"),
      source: "WEBHOOK",
      webhookEventId: webhook.id,
      providerPaymentId: event.providerPaymentId ?? null,
      failureCategory: nextStatus === "FAILED" ? "PROVIDER_FAILURE" : null,
      failureReasonCode:
        nextStatus === "FAILED"
          ? (event.failureReasonCode ?? "PAYMENT_FAILED")
          : null,
      safeMetadata: {
        provider,
        eventType: event.eventType,
      },
    });
    if (nextStatus === "PAID") {
      await markOrderPaidInTransaction({
        transaction,
        orderId: payment.orderId,
        actorId: null,
        idempotencyKeyHash: hashIdempotencyKey(
          `payment-webhook:${provider}:${event.eventId}`,
        ),
        publicNote: "Payment was verified by the provider.",
        reasonCode: "PROVIDER_PAYMENT_VERIFIED",
      });
    }
    if (nextStatus === "FAILED" && !transitioned.idempotent) {
      await queueOrderEmailDelivery({
        transaction,
        templateType: "PAYMENT_FAILED",
        orderId: payment.orderId,
        recipientEmail: payment.order.guestContact.email,
        orderNumber: payment.order.orderNumber,
        subject: `Payment update for order ${payment.order.orderNumber}`,
        dedupeKey: `payment-failed:${payment.id}:${event.eventId}`,
        safeMetadata: {
          paymentProvider: provider,
          failureReasonCode: event.failureReasonCode ?? "PAYMENT_FAILED",
        },
      });
    }
    await transaction.paymentWebhookEvent.update({
      where: { id: webhook.id },
      data: {
        status: "PROCESSED",
        orderId: payment.orderId,
        transactionId: payment.id,
        processedAt: new Date(),
      },
    });
    return {
      ok: true,
      duplicate: transitioned.idempotent,
      status: "PROCESSED" as const,
    };
  });
}

export function sanitizePaymentWebhookError(error: unknown) {
  if (error instanceof PaymentError) {
    return { message: error.message, status: error.status };
  }
  return { message: "Payment webhook could not be processed.", status: 400 };
}
