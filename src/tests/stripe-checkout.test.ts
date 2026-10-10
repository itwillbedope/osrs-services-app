import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
const config = vi.hoisted(() => ({
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  EXTERNAL_PAYMENTS_ENABLED: true,
  PAYMENT_WEBHOOKS_ENABLED: true,
  NEXT_PUBLIC_APP_URL: "https://osrsservices.com",
}));
vi.mock("@/lib/env", () => ({ env: config }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { stripeHostedAdapter } from "@/lib/payments/stripe";
import { stripeCheckoutEvent } from "@/lib/payments/stripe-events";
function event(type = "checkout.session.completed", paymentStatus = "paid") {
  return {
    id: "evt_test",
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        object: "checkout.session",
        metadata: { transactionId: "transaction-1" },
        payment_status: paymentStatus,
        amount_total: 4284,
        currency: "usd",
        payment_intent: "pi_test",
      },
    },
  } as unknown as Stripe.Event;
}
describe("Stripe verification", () => {
  it("verifies signed raw payload and rejects tampering", async () => {
    const stripe = new Stripe(config.STRIPE_SECRET_KEY);
    const payload = JSON.stringify(event());
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: config.STRIPE_WEBHOOK_SECRET,
    });
    const verified = await stripeHostedAdapter.verifyWebhook({
      payload,
      signature,
    });
    expect(verified.ok).toBe(true);
    expect(verified.event?.amountMinor).toBe(4284);
    expect(
      (
        await stripeHostedAdapter.verifyWebhook({
          payload: payload.replace("4284", "1"),
          signature,
        })
      ).ok,
    ).toBe(false);
    expect(
      (await stripeHostedAdapter.verifyWebhook({ payload, signature: null }))
        .ok,
    ).toBe(false);
  });
  it("ignores unpaid completion and accepts async confirmation", () => {
    expect(
      stripeCheckoutEvent(event("checkout.session.completed", "unpaid")),
    ).toBeNull();
    expect(
      stripeCheckoutEvent(event("checkout.session.async_payment_succeeded"))
        ?.status,
    ).toBe("PAID");
    expect(
      stripeCheckoutEvent(event("checkout.session.expired", "unpaid"))?.status,
    ).toBe("EXPIRED");
  });
  it("acknowledges signed unrelated events without order changes", async () => {
    const stripe = new Stripe(config.STRIPE_SECRET_KEY);
    const payload = JSON.stringify(event("customer.created"));
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: config.STRIPE_WEBHOOK_SECRET,
    });
    expect(
      await stripeHostedAdapter.verifyWebhook({ payload, signature }),
    ).toEqual({ ok: true, ignored: true });
  });
});
