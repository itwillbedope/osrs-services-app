import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type {
  PaymentProviderType,
  PaymentTransactionStatus,
} from "@/generated/prisma/client";
import {
  signTestHostedPayload,
  verifyTestHostedSignature,
  type HostedWebhookFixture,
} from "@/lib/payments/core";
import { env } from "@/lib/env";

export type HostedCheckoutSession = {
  provider: PaymentProviderType;
  providerCheckoutId: string | null;
  providerPaymentId: string | null;
  status: PaymentTransactionStatus;
  redirectUrl: string | null;
  safeMetadata: Record<string, unknown>;
};

export type PaymentProviderAdapter = {
  provider: PaymentProviderType;
  createHostedCheckoutSession(input: {
    transactionId: string;
    orderId: string;
    orderNumber: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<HostedCheckoutSession>;
  retrievePayment(input: {
    providerPaymentId?: string | null;
    providerCheckoutId?: string | null;
  }): Promise<{
    provider: PaymentProviderType;
    providerPaymentId: string | null;
    providerCheckoutId: string | null;
    status: PaymentTransactionStatus;
    amountMinor: number | null;
    currency: string | null;
    createdAt: Date;
    safeMetadata: Record<string, unknown>;
  }>;
  verifyWebhook(input: { payload: string; signature: string | null }): Promise<{
    ok: boolean;
    event?: HostedWebhookFixture;
    failureCode?: string;
  }>;
  handleWebhookEvent(input: {
    event: HostedWebhookFixture;
  }): Promise<HostedWebhookFixture>;
  cancelPayment(input: {
    transactionId: string;
    providerPaymentId?: string | null;
    providerCheckoutId?: string | null;
  }): Promise<{
    status: PaymentTransactionStatus;
    safeMetadata: Record<string, unknown>;
  }>;
  requestRefund(input: {
    transactionId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{
    status: "REQUESTED" | "PENDING" | "SUCCEEDED" | "FAILED";
    providerRefundId: string | null;
    safeMetadata: Record<string, unknown>;
  }>;
  validateConfiguration(): Promise<{
    ready: boolean;
    status: "READY" | "NOT_READY" | "DISABLED" | "NEEDS_CLIENT_REVIEW";
    safeMessage: string;
  }>;
};

function testHostedSecret() {
  return env.TEST_HOSTED_PAYMENT_SECRET || env.AUTH_SECRET;
}

function digest(...parts: string[]) {
  return createHash("sha256").update(parts.join(":"), "utf8").digest("hex");
}

export const manualReviewAdapter: PaymentProviderAdapter = {
  provider: "MANUAL_REVIEW",
  async createHostedCheckoutSession() {
    return {
      provider: "MANUAL_REVIEW",
      providerCheckoutId: null,
      providerPaymentId: null,
      status: "PENDING",
      redirectUrl: null,
      safeMetadata: { mode: "manual_review", externalNetworkCalls: false },
    };
  },
  async retrievePayment() {
    return {
      provider: "MANUAL_REVIEW",
      providerPaymentId: null,
      providerCheckoutId: null,
      status: "PENDING",
      amountMinor: null,
      currency: null,
      createdAt: new Date(),
      safeMetadata: { mode: "manual_review" },
    };
  },
  async verifyWebhook() {
    return { ok: false, failureCode: "MANUAL_REVIEW_HAS_NO_WEBHOOKS" };
  },
  async handleWebhookEvent(input) {
    return input.event;
  },
  async cancelPayment() {
    return {
      status: "CANCELLED",
      safeMetadata: { mode: "manual_review", externalNetworkCalls: false },
    };
  },
  async requestRefund(input) {
    return {
      status: "REQUESTED",
      providerRefundId: `manual-refund-${digest(input.transactionId, input.idempotencyKey).slice(0, 24)}`,
      safeMetadata: { mode: "manual_review", requiresStaffFollowUp: true },
    };
  },
  async validateConfiguration() {
    return {
      ready: true,
      status: "READY",
      safeMessage: "Manual review requires no external provider secrets.",
    };
  },
};

export const testHostedAdapter: PaymentProviderAdapter = {
  provider: "TEST_HOSTED",
  async createHostedCheckoutSession(input) {
    if (env.NODE_ENV === "production") {
      throw new Error("TEST_HOSTED checkout is blocked in production.");
    }
    const providerCheckoutId = `test_ch_${digest(input.transactionId, input.idempotencyKey).slice(0, 24)}`;
    const redirectUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/checkout/payment/${input.transactionId}/pending?providerCheckoutId=${providerCheckoutId}`;
    return {
      provider: "TEST_HOSTED",
      providerCheckoutId,
      providerPaymentId: null,
      status: "REQUIRES_CUSTOMER_ACTION",
      redirectUrl,
      safeMetadata: {
        fixture: true,
        externalNetworkCalls: false,
        orderNumber: input.orderNumber,
      },
    };
  },
  async retrievePayment(input) {
    if (env.NODE_ENV === "production") {
      throw new Error("TEST_HOSTED retrieval is blocked in production.");
    }
    return {
      provider: "TEST_HOSTED",
      providerPaymentId: input.providerPaymentId ?? null,
      providerCheckoutId: input.providerCheckoutId ?? null,
      status: "PENDING",
      amountMinor: null,
      currency: null,
      createdAt: new Date(),
      safeMetadata: { fixture: true, externalNetworkCalls: false },
    };
  },
  async verifyWebhook(input) {
    if (env.NODE_ENV === "production") {
      return { ok: false, failureCode: "TEST_HOSTED_PRODUCTION_BLOCKED" };
    }
    if (
      !verifyTestHostedSignature({
        payload: input.payload,
        signature: input.signature,
        secret: testHostedSecret(),
      })
    ) {
      return { ok: false, failureCode: "INVALID_SIGNATURE" };
    }
    try {
      const parsed = JSON.parse(input.payload) as HostedWebhookFixture;
      if (
        !parsed.eventId ||
        !parsed.eventType ||
        !parsed.transactionId ||
        !Number.isInteger(parsed.amountMinor) ||
        !/^[A-Z]{3}$/.test(parsed.currency)
      ) {
        return { ok: false, failureCode: "INVALID_EVENT_SHAPE" };
      }
      return { ok: true, event: parsed };
    } catch {
      return { ok: false, failureCode: "INVALID_JSON" };
    }
  },
  async handleWebhookEvent(input) {
    return input.event;
  },
  async cancelPayment(input) {
    if (env.NODE_ENV === "production") {
      throw new Error("TEST_HOSTED cancellation is blocked in production.");
    }
    return {
      status: "CANCELLED",
      safeMetadata: {
        fixture: true,
        providerCheckoutId: input.providerCheckoutId ?? null,
      },
    };
  },
  async requestRefund(input) {
    if (env.NODE_ENV === "production") {
      throw new Error("TEST_HOSTED refunds are blocked in production.");
    }
    return {
      status: "SUCCEEDED",
      providerRefundId: `test_rf_${digest(input.transactionId, input.idempotencyKey).slice(0, 24)}`,
      safeMetadata: {
        fixture: true,
        amountMinor: input.amountMinor,
        currency: input.currency,
      },
    };
  },
  async validateConfiguration() {
    if (env.NODE_ENV === "production") {
      return {
        ready: false,
        status: "NOT_READY",
        safeMessage: "TEST_HOSTED is blocked in production.",
      };
    }
    return {
      ready: Boolean(testHostedSecret()),
      status: testHostedSecret() ? "READY" : "NOT_READY",
      safeMessage:
        "TEST_HOSTED uses deterministic local fixtures and never calls the internet.",
    };
  },
};

export function adapterForProvider(provider: PaymentProviderType) {
  if (provider === "MANUAL_REVIEW") return manualReviewAdapter;
  if (provider === "TEST_HOSTED") return testHostedAdapter;
  throw new Error(
    "No approved external hosted checkout provider adapter is configured.",
  );
}

export function createTestHostedWebhookFixture(input: {
  transactionId: string;
  eventType: HostedWebhookFixture["eventType"];
  amountMinor: number;
  currency: string;
  providerPaymentId?: string;
  failureReasonCode?: string;
}) {
  const fixture: HostedWebhookFixture = {
    eventId: `evt_${randomBytes(12).toString("hex")}`,
    eventType: input.eventType,
    transactionId: input.transactionId,
    providerPaymentId: input.providerPaymentId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    status:
      input.eventType === "payment.succeeded"
        ? "PAID"
        : input.eventType === "payment.cancelled"
          ? "CANCELLED"
          : input.eventType === "refund.succeeded"
            ? "REFUNDED"
            : "FAILED",
    failureReasonCode: input.failureReasonCode,
    createdAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(fixture);
  return {
    fixture,
    payload,
    signature: signTestHostedPayload(payload, testHostedSecret()),
  };
}
