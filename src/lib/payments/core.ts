import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentProvider =
  "MANUAL_REVIEW" | "TEST_HOSTED" | "EXTERNAL_HOSTED_CHECKOUT";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "REQUIRES_CUSTOMER_ACTION"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "EXPIRED";

export type PaymentEligibilityMode =
  "MANUAL_ONLY" | "PROVIDER_ALLOWED" | "PROVIDER_REVIEW_REQUIRED" | "DISABLED";

export type PaymentEligibilityInput = {
  sourceKey: string;
  mode: PaymentEligibilityMode;
  needsClientReview?: boolean;
};

export type HostedWebhookFixture = {
  eventId: string;
  eventType:
    | "payment.succeeded"
    | "payment.failed"
    | "payment.cancelled"
    | "refund.succeeded";
  transactionId: string;
  providerPaymentId?: string;
  amountMinor: number;
  currency: string;
  status?: PaymentStatus;
  failureReasonCode?: string;
  createdAt: string;
};

const statusRank: Record<PaymentStatus, number> = {
  CREATED: 0,
  PENDING: 1,
  REQUIRES_CUSTOMER_ACTION: 2,
  AUTHORIZED: 3,
  FAILED: 4,
  CANCELLED: 4,
  EXPIRED: 4,
  PAID: 5,
  PARTIALLY_REFUNDED: 6,
  REFUNDED: 7,
};

const terminalStatuses = new Set<PaymentStatus>([
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "EXPIRED",
]);

const sensitiveMetadataKeyPattern =
  /(password|passcode|credential|secret|session|cookie|token|cvv|cvc|card|pan|stripe|paypal|private|seed|wallet|bank|authenticator|recovery)/i;

export function assertAmountMinor(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100_000_000) {
    throw new Error("Payment amount must be a safe integer minor-unit value.");
  }
  return value;
}

export function assertCurrencyCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Payment currency must be a three-letter code.");
  }
  return normalized;
}

export function assertPaymentAmountMatchesOrder(input: {
  orderAmountMinor: number;
  paymentAmountMinor: number;
  orderCurrency: string;
  paymentCurrency: string;
}) {
  const orderAmount = assertAmountMinor(input.orderAmountMinor);
  const paymentAmount = assertAmountMinor(input.paymentAmountMinor);
  const orderCurrency = assertCurrencyCode(input.orderCurrency);
  const paymentCurrency = assertCurrencyCode(input.paymentCurrency);
  if (orderAmount !== paymentAmount) {
    throw new Error("Payment amount does not match the server order total.");
  }
  if (orderCurrency !== paymentCurrency) {
    throw new Error(
      "Payment currency does not match the server order currency.",
    );
  }
}

export function providerCheckoutAllowed(rules: PaymentEligibilityInput[]) {
  if (!rules.length) {
    return {
      allowed: false,
      reason: "Payment eligibility is not configured.",
      blockingMode: "PROVIDER_REVIEW_REQUIRED" as PaymentEligibilityMode,
    };
  }
  const disabled = rules.find((rule) => rule.mode === "DISABLED");
  if (disabled) {
    return {
      allowed: false,
      reason: `${disabled.sourceKey} is disabled for checkout.`,
      blockingMode: disabled.mode,
    };
  }
  const manualOnly = rules.find((rule) => rule.mode === "MANUAL_ONLY");
  if (manualOnly) {
    return {
      allowed: false,
      reason: `${manualOnly.sourceKey} is manual-review only.`,
      blockingMode: manualOnly.mode,
    };
  }
  const review = rules.find(
    (rule) =>
      rule.mode === "PROVIDER_REVIEW_REQUIRED" || rule.needsClientReview,
  );
  if (review) {
    return {
      allowed: false,
      reason: `${review.sourceKey} still needs merchant payment-provider review.`,
      blockingMode: "PROVIDER_REVIEW_REQUIRED" as PaymentEligibilityMode,
    };
  }
  return {
    allowed: true,
    reason: "Provider checkout allowed.",
    blockingMode: null,
  };
}

export function shouldApplyPaymentTransition(
  current: PaymentStatus,
  next: PaymentStatus,
) {
  if (current === next) return { apply: false, idempotent: true };
  if (current === "REFUNDED") return { apply: false, idempotent: true };
  if (current === "PAID" && ["FAILED", "CANCELLED", "EXPIRED"].includes(next)) {
    return { apply: false, idempotent: true };
  }
  if (terminalStatuses.has(current) && statusRank[next] < statusRank[current]) {
    return { apply: false, idempotent: true };
  }
  return { apply: statusRank[next] >= statusRank[current], idempotent: false };
}

export function safePaymentMetadata(input: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (sensitiveMetadataKeyPattern.test(key)) continue;
    if (typeof value === "string") {
      output[key] = value.slice(0, 240);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      output[key] = value;
    }
  }
  return output;
}

export function signTestHostedPayload(payload: string, secret: string) {
  if (secret.length < 32) {
    throw new Error(
      "TEST_HOSTED signature secret must be at least 32 characters.",
    );
  }
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function verifyTestHostedSignature(input: {
  payload: string;
  signature: string | null | undefined;
  secret: string;
}) {
  if (!input.signature || !/^[a-f0-9]{64}$/i.test(input.signature)) {
    return false;
  }
  const expected = signTestHostedPayload(input.payload, input.secret);
  const left = Buffer.from(input.signature, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
