import "server-only";

import type {
  PaymentProviderType,
  PaymentTransaction,
  PaymentTransactionStatus,
  Prisma,
} from "@/generated/prisma/client";
import { hashIdempotencyKey } from "@/lib/checkout/security";
import { prisma } from "@/lib/db/prisma";
import { adapterForProvider } from "@/lib/payments/adapters";
import {
  assertAmountMinor,
  assertCurrencyCode,
  safePaymentMetadata,
  shouldApplyPaymentTransition,
} from "@/lib/payments/core";
import { PaymentError } from "@/lib/payments/eligibility";

function safeJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function nextPaymentTransactionSequence(
  transaction: Prisma.TransactionClient,
  transactionId: string,
) {
  const aggregate = await transaction.paymentTransactionEvent.aggregate({
    where: { transactionId },
    _max: { sequence: true },
  });
  return (aggregate._max.sequence ?? 0) + 1;
}

export async function createPaymentTransactionForCheckout({
  transaction,
  orderId,
  provider,
  amountMinor,
  currencyCode,
  idempotencyKey,
  status,
  safeMetadata,
}: {
  transaction: Prisma.TransactionClient;
  orderId: string;
  provider: PaymentProviderType;
  amountMinor: number;
  currencyCode: string;
  idempotencyKey: string;
  status: PaymentTransactionStatus;
  safeMetadata?: Record<string, unknown>;
}) {
  const normalizedCurrency = assertCurrencyCode(currencyCode);
  const normalizedAmount = assertAmountMinor(amountMinor);
  const idempotencyKeyHash = hashIdempotencyKey(idempotencyKey);
  const created = await transaction.paymentTransaction.upsert({
    where: {
      orderId_idempotencyKeyHash: {
        orderId,
        idempotencyKeyHash,
      },
    },
    create: {
      orderId,
      provider,
      status,
      transactionType:
        provider === "MANUAL_REVIEW" ? "MANUAL_CONFIRMATION" : "PAYMENT",
      amountMinor: normalizedAmount,
      currencyCode: normalizedCurrency,
      idempotencyKeyHash,
      safeMetadata: safeJson(
        safePaymentMetadata({
          checkoutCreated: true,
          provider,
          ...(safeMetadata ?? {}),
        }),
      ),
    },
    update: {},
  });
  const existingEvent = await transaction.paymentTransactionEvent.findFirst({
    where: { transactionId: created.id, sequence: 1 },
    select: { id: true },
  });
  if (!existingEvent) {
    await transaction.paymentTransactionEvent.create({
      data: {
        transactionId: created.id,
        previousStatus: null,
        newStatus: status,
        eventType: "CHECKOUT_TRANSACTION_CREATED",
        sequence: 1,
        source: "CHECKOUT",
        safeMetadata: safeJson({ provider, amountMinor: normalizedAmount }),
      },
    });
  }
  return created;
}

export async function createHostedCheckoutForTransaction(input: {
  transactionId: string;
  idempotencyKey: string;
}) {
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: input.transactionId },
    include: { order: true },
  });
  if (!payment)
    throw new PaymentError("Payment transaction was not found.", 404);
  if (payment.provider === "MANUAL_REVIEW") {
    return { redirectUrl: null, payment };
  }
  const adapter = adapterForProvider(payment.provider);
  const session = await adapter.createHostedCheckoutSession({
    transactionId: payment.id,
    orderId: payment.orderId,
    orderNumber: payment.order.orderNumber,
    amountMinor: payment.amountMinor,
    currency: payment.currencyCode,
    idempotencyKey: input.idempotencyKey,
  });
  const updated = await prisma.$transaction(async (transaction) => {
    const locked = await transaction.paymentTransaction.findUniqueOrThrow({
      where: { id: payment.id },
    });
    const transition = shouldApplyPaymentTransition(
      locked.status,
      session.status,
    );
    if (!transition.apply) return locked;
    const sequence = await nextPaymentTransactionSequence(
      transaction,
      locked.id,
    );
    const updatedPayment = await transaction.paymentTransaction.update({
      where: { id: locked.id },
      data: {
        providerCheckoutId: session.providerCheckoutId,
        providerPaymentId: session.providerPaymentId,
        status: session.status,
        safeMetadata: safeJson(
          safePaymentMetadata({
            provider: session.provider,
            providerCheckoutId: session.providerCheckoutId,
            ...session.safeMetadata,
          }),
        ),
        concurrencyVersion: { increment: 1 },
      },
    });
    await transaction.paymentTransactionEvent.create({
      data: {
        transactionId: locked.id,
        previousStatus: locked.status,
        newStatus: session.status,
        eventType: "HOSTED_CHECKOUT_SESSION_CREATED",
        sequence,
        source: "PROVIDER_ADAPTER",
        safeMetadata: safeJson(
          safePaymentMetadata({
            providerCheckoutId: session.providerCheckoutId,
          }),
        ),
      },
    });
    return updatedPayment;
  });
  return { redirectUrl: session.redirectUrl, payment: updated };
}

export async function transitionPaymentTransaction(input: {
  transaction: Prisma.TransactionClient;
  payment: PaymentTransaction;
  nextStatus: PaymentTransactionStatus;
  eventType: string;
  source: string;
  actorId?: string | null;
  webhookEventId?: string | null;
  refundId?: string | null;
  providerPaymentId?: string | null;
  failureCategory?: string | null;
  failureReasonCode?: string | null;
  safeMetadata?: Record<string, unknown>;
}) {
  const transition = shouldApplyPaymentTransition(
    input.payment.status,
    input.nextStatus,
  );
  if (!transition.apply) {
    return { payment: input.payment, idempotent: transition.idempotent };
  }
  const sequence = await nextPaymentTransactionSequence(
    input.transaction,
    input.payment.id,
  );
  const now = new Date();
  const updated = await input.transaction.paymentTransaction.update({
    where: { id: input.payment.id },
    data: {
      status: input.nextStatus,
      providerPaymentId:
        input.providerPaymentId ?? input.payment.providerPaymentId,
      failureCategory: input.failureCategory ?? null,
      failureReasonCode: input.failureReasonCode ?? null,
      authorizedAt:
        input.nextStatus === "AUTHORIZED" ? now : input.payment.authorizedAt,
      paidAt: input.nextStatus === "PAID" ? now : input.payment.paidAt,
      cancelledAt:
        input.nextStatus === "CANCELLED" ? now : input.payment.cancelledAt,
      refundedAt:
        input.nextStatus === "REFUNDED" ? now : input.payment.refundedAt,
      safeMetadata: input.safeMetadata
        ? safeJson(safePaymentMetadata(input.safeMetadata))
        : undefined,
      concurrencyVersion: { increment: 1 },
    },
  });
  await input.transaction.paymentTransactionEvent.create({
    data: {
      transactionId: input.payment.id,
      previousStatus: input.payment.status,
      newStatus: input.nextStatus,
      eventType: input.eventType,
      sequence,
      source: input.source,
      actorId: input.actorId ?? null,
      webhookEventId: input.webhookEventId ?? null,
      refundId: input.refundId ?? null,
      safeMetadata: input.safeMetadata
        ? safeJson(safePaymentMetadata(input.safeMetadata))
        : undefined,
    },
  });
  return { payment: updated, idempotent: false };
}

export async function getCheckoutPaymentResume(orderId: string) {
  const payment = await prisma.paymentTransaction.findFirst({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });
  if (!payment || payment.provider === "MANUAL_REVIEW") {
    return { redirectUrl: null, payment };
  }
  if (payment.provider === "TEST_HOSTED" && payment.providerCheckoutId) {
    return {
      payment,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/checkout/payment/${payment.id}/pending?providerCheckoutId=${payment.providerCheckoutId}`,
    };
  }
  return { redirectUrl: null, payment };
}
