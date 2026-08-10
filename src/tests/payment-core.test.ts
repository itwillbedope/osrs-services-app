import { describe, expect, it } from "vitest";

import { defaultRoles } from "../../prisma/seed-core";
import {
  assertAmountMinor,
  assertCurrencyCode,
  assertPaymentAmountMatchesOrder,
  providerCheckoutAllowed,
  safePaymentMetadata,
  shouldApplyPaymentTransition,
  signTestHostedPayload,
  verifyTestHostedSignature,
} from "@/lib/payments/core";
import { permissions } from "@/lib/auth/permissions";

describe("payment core safety", () => {
  it("requires integer minor amounts and normalized currency codes", () => {
    expect(assertAmountMinor(1299)).toBe(1299);
    expect(assertCurrencyCode(" usd ")).toBe("USD");
    expect(() => assertAmountMinor(12.5)).toThrow(/minor-unit/);
    expect(() => assertAmountMinor(-1)).toThrow(/minor-unit/);
    expect(() => assertCurrencyCode("USDT")).toThrow(/three-letter/);
  });

  it("rejects provider amount and currency mismatches", () => {
    expect(() =>
      assertPaymentAmountMatchesOrder({
        orderAmountMinor: 3200,
        paymentAmountMinor: 3200,
        orderCurrency: "USD",
        paymentCurrency: "usd",
      }),
    ).not.toThrow();
    expect(() =>
      assertPaymentAmountMatchesOrder({
        orderAmountMinor: 3200,
        paymentAmountMinor: 3100,
        orderCurrency: "USD",
        paymentCurrency: "USD",
      }),
    ).toThrow(/amount/);
    expect(() =>
      assertPaymentAmountMatchesOrder({
        orderAmountMinor: 3200,
        paymentAmountMinor: 3200,
        orderCurrency: "USD",
        paymentCurrency: "EUR",
      }),
    ).toThrow(/currency/);
  });

  it("keeps hosted checkout blocked until every rule is provider allowed", () => {
    expect(providerCheckoutAllowed([])).toMatchObject({ allowed: false });
    expect(
      providerCheckoutAllowed([
        { sourceKey: "GOLD_BUY_ESTIMATE", mode: "MANUAL_ONLY" },
      ]),
    ).toMatchObject({ allowed: false, blockingMode: "MANUAL_ONLY" });
    expect(
      providerCheckoutAllowed([
        {
          sourceKey: "skilling",
          mode: "PROVIDER_ALLOWED",
          needsClientReview: true,
        },
      ]),
    ).toMatchObject({
      allowed: false,
      blockingMode: "PROVIDER_REVIEW_REQUIRED",
    });
    expect(
      providerCheckoutAllowed([
        {
          sourceKey: "skilling",
          mode: "PROVIDER_ALLOWED",
          needsClientReview: false,
        },
      ]),
    ).toMatchObject({ allowed: true });
  });

  it("prevents regressive payment status transitions", () => {
    expect(shouldApplyPaymentTransition("PENDING", "PAID")).toEqual({
      apply: true,
      idempotent: false,
    });
    expect(shouldApplyPaymentTransition("PAID", "FAILED")).toEqual({
      apply: false,
      idempotent: true,
    });
    expect(shouldApplyPaymentTransition("REFUNDED", "PAID")).toEqual({
      apply: false,
      idempotent: true,
    });
  });

  it("uses deterministic TEST_HOSTED HMAC verification", () => {
    const secret = "task016-test-hosted-secret-at-least-32-chars";
    const payload = JSON.stringify({ eventId: "evt_task016" });
    const signature = signTestHostedPayload(payload, secret);
    expect(verifyTestHostedSignature({ payload, signature, secret })).toBe(
      true,
    );
    expect(
      verifyTestHostedSignature({
        payload: `${payload} `,
        signature,
        secret,
      }),
    ).toBe(false);
  });

  it("removes sensitive metadata keys before storage", () => {
    expect(
      safePaymentMetadata({
        orderNumber: "TASK016",
        providerPaymentId: "test_py_safe",
        cardNumber: "4111111111111111",
        sessionToken: "raw-token",
        amountMinor: 3200,
      }),
    ).toEqual({
      orderNumber: "TASK016",
      providerPaymentId: "test_py_safe",
      amountMinor: 3200,
    });
  });
});

describe("payment permission defaults", () => {
  it("keeps support agents out of payment configuration and refunds", () => {
    const support = defaultRoles.find((role) => role.key === "SUPPORT_AGENT")!;
    expect(support.permissions).toContain(permissions.paymentsView);
    expect(support.permissions).toContain(permissions.paymentsReview);
    expect(support.permissions).not.toContain(permissions.paymentsRefund);
    expect(support.permissions).not.toContain(permissions.paymentsConfigure);
    expect(support.permissions).not.toContain(
      permissions.paymentsEligibilityManage,
    );
  });

  it("grants full payment permissions only through Super Admin defaults", () => {
    const superAdmin = defaultRoles.find((role) => role.key === "SUPER_ADMIN")!;
    expect(superAdmin.permissions).toEqual(
      expect.arrayContaining([
        permissions.paymentsView,
        permissions.paymentsReview,
        permissions.paymentsRefund,
        permissions.paymentsConfigure,
        permissions.paymentsEligibilityManage,
      ]),
    );
  });
});
