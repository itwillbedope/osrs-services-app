import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { notifyLinkedOrderCustomer } from "@/lib/customer/account";
import { hashIdempotencyKey } from "@/lib/checkout/security";
import { prisma } from "@/lib/db/prisma";
import { queueOrderEmailDelivery } from "@/lib/email/delivery";
import { adapterForProvider } from "@/lib/payments/adapters";
import { PAYMENT_REFUNDS_FEATURE_FLAG } from "@/lib/payments/constants";
import { assertAmountMinor, safePaymentMetadata } from "@/lib/payments/core";
import { PaymentError } from "@/lib/payments/eligibility";
import { transitionPaymentTransaction } from "@/lib/payments/transactions";

function safeJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function featureEnabled(key: string) {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true },
  });
  return Boolean(flag?.enabled);
}

async function nextPaymentSequence(
  transaction: Prisma.TransactionClient,
  orderId: string,
) {
  const aggregate = await transaction.orderPaymentEvent.aggregate({
    where: { orderId },
    _max: { sequence: true },
  });
  return (aggregate._max.sequence ?? 0) + 1;
}

async function nextStatusSequence(
  transaction: Prisma.TransactionClient,
  orderId: string,
) {
  const aggregate = await transaction.orderStatusEvent.aggregate({
    where: { orderId },
    _max: { sequence: true },
  });
  return (aggregate._max.sequence ?? 0) + 1;
}

export async function requestPaymentRefund(input: {
  transactionId: string;
  amountMinor: number;
  reasonCode: string;
  safeNote?: string | null;
  actorId: string;
  idempotencyKey: string;
}) {
  if (!(await featureEnabled(PAYMENT_REFUNDS_FEATURE_FLAG))) {
    throw new PaymentError("Payment refunds are not enabled.", 403);
  }
  const amountMinor = assertAmountMinor(input.amountMinor);
  if (amountMinor <= 0) {
    throw new PaymentError("Refund amount must be greater than zero.");
  }
  const idempotencyKeyHash = hashIdempotencyKey(input.idempotencyKey);
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: input.transactionId },
    include: {
      order: { include: { guestContact: { select: { email: true } } } },
      refunds: true,
    },
  });
  if (!payment)
    throw new PaymentError("Payment transaction was not found.", 404);
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) {
    throw new PaymentError("Only paid transactions can be refunded.");
  }
  const alreadyRefunded = payment.refunds
    .filter((refund) => ["PENDING", "SUCCEEDED"].includes(refund.status))
    .reduce((total, refund) => total + refund.amountMinor, 0);
  const remaining = payment.amountMinor - alreadyRefunded;
  if (amountMinor > remaining) {
    throw new PaymentError("Refund amount exceeds the remaining paid amount.");
  }
  const existing = await prisma.paymentRefund.findFirst({
    where: {
      transactionId: payment.id,
      idempotencyKeyHash,
    },
  });
  if (existing) return { idempotent: true, refund: existing };

  const adapter = adapterForProvider(payment.provider);
  const providerResult = await adapter.requestRefund({
    transactionId: payment.id,
    amountMinor,
    currency: payment.currencyCode,
    idempotencyKey: input.idempotencyKey,
  });

  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.paymentRefund.findFirst({
      where: {
        transactionId: payment.id,
        idempotencyKeyHash,
      },
    });
    if (existing) return { idempotent: true, refund: existing };

    const refund = await transaction.paymentRefund.create({
      data: {
        transactionId: payment.id,
        orderId: payment.orderId,
        amountMinor,
        currencyCode: payment.currencyCode,
        status: providerResult.status,
        providerRefundId: providerResult.providerRefundId,
        idempotencyKeyHash,
        reasonCode: input.reasonCode.slice(0, 80),
        safeNote: input.safeNote?.slice(0, 500) ?? null,
        requestedById: input.actorId,
        processedAt:
          providerResult.status === "SUCCEEDED" ? new Date() : undefined,
        failedAt: providerResult.status === "FAILED" ? new Date() : undefined,
      },
    });
    const fullRefund = amountMinor === remaining;
    if (providerResult.status === "SUCCEEDED") {
      const nextStatus = fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await transitionPaymentTransaction({
        transaction,
        payment,
        nextStatus,
        eventType: fullRefund ? "REFUND_SUCCEEDED" : "PARTIAL_REFUND_SUCCEEDED",
        source: "ADMIN_REFUND",
        actorId: input.actorId,
        refundId: refund.id,
        safeMetadata: safePaymentMetadata({
          amountMinor,
          currency: payment.currencyCode,
          providerRefundId: providerResult.providerRefundId,
        }),
      });
    }
    if (providerResult.status === "SUCCEEDED" && fullRefund) {
      const paymentSequence = await nextPaymentSequence(
        transaction,
        payment.orderId,
      );
      const statusSequence = await nextStatusSequence(
        transaction,
        payment.orderId,
      );
      await transaction.order.update({
        where: { id: payment.orderId },
        data: {
          status: "REFUNDED",
          paymentStatus: "REFUNDED",
          concurrencyVersion: { increment: 1 },
        },
      });
      await transaction.orderPaymentEvent.create({
        data: {
          orderId: payment.orderId,
          previousPaymentStatus: payment.order.paymentStatus,
          newPaymentStatus: "REFUNDED",
          paymentMethodType: payment.order.paymentMethodType,
          actorId: input.actorId,
          publicNote: "Payment refund was recorded.",
          privateInternalNote: input.safeNote?.slice(0, 2000) ?? null,
          reasonCode: "PAYMENT_REFUNDED",
          sequence: paymentSequence,
          idempotencyKeyHash,
          safeMetadata: safeJson({ amountMinor }),
        },
      });
      await transaction.orderStatusEvent.create({
        data: {
          orderId: payment.orderId,
          eventType: "STATUS_CHANGED",
          previousStatus: payment.order.status,
          newStatus: "REFUNDED",
          actorId: input.actorId,
          publicNote: "Order payment was refunded.",
          privateInternalNote: input.safeNote?.slice(0, 2000) ?? null,
          reasonCode: "PAYMENT_REFUNDED",
          sequence: statusSequence,
        },
      });
    }
    await notifyLinkedOrderCustomer({
      transaction,
      orderId: payment.orderId,
      type: "ORDER_PAYMENT_CHANGED",
      title:
        providerResult.status === "SUCCEEDED"
          ? fullRefund
            ? "Payment refunded"
            : "Payment partially refunded"
          : "Payment refund requested",
      body:
        providerResult.status === "SUCCEEDED"
          ? fullRefund
            ? "Payment refund was recorded for this order."
            : "A partial payment refund was recorded for this order."
          : "A payment refund request was recorded for staff follow-up.",
      dedupeKey: `payment-refund:${refund.id}`,
      safeMetadata: { amountMinor, fullRefund },
    });
    if (providerResult.status === "SUCCEEDED") {
      await queueOrderEmailDelivery({
        transaction,
        templateType: "ORDER_STATUS_UPDATE",
        orderId: payment.orderId,
        recipientEmail: payment.order.guestContact.email,
        orderNumber: payment.order.orderNumber,
        subject: `Order ${payment.order.orderNumber} refund recorded`,
        dedupeKey: `payment-refund-email:${refund.id}`,
        safeMetadata: { amountMinor, fullRefund },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "payments.refund.requested",
        targetType: "PaymentTransaction",
        targetId: payment.id,
        metadata: safeJson({
          orderNumber: payment.order.orderNumber,
          amountMinor,
          fullRefund,
        }),
      },
    });
    return { idempotent: false, refund };
  });
}

export function sanitizePaymentError(error: unknown) {
  if (error instanceof PaymentError) {
    return { message: error.message, status: error.status };
  }
  return {
    message: "The payment action could not be completed safely.",
    status: 500,
  };
}
