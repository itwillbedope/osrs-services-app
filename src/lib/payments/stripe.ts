import "server-only";
import Stripe from "stripe";
import type { PaymentProviderAdapter } from "@/lib/payments/adapters";
import { stripeCheckoutEvent } from "@/lib/payments/stripe-events";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";

export function stripeConfigurationReady() {
  return (
    /^sk_(test|live)_/.test(env.STRIPE_SECRET_KEY) &&
    env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")
  );
}
function client() {
  if (!stripeConfigurationReady())
    throw new Error(
      "Stripe keys and webhook configuration are required before payment can start.",
    );
  return new Stripe(env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 15000,
  });
}
function safeRedirect(value: string | null) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
    throw new Error("Unexpected hosted checkout destination.");
  return url.toString();
}
export async function stripeSessionUrl(id: string) {
  return safeRedirect((await client().checkout.sessions.retrieve(id)).url);
}
export const stripeHostedAdapter: PaymentProviderAdapter = {
  provider: "EXTERNAL_HOSTED_CHECKOUT",
  async createHostedCheckoutSession(input) {
    if (!env.EXTERNAL_PAYMENTS_ENABLED || !env.PAYMENT_WEBHOOKS_ENABLED)
      throw new Error("Stripe checkout is not enabled.");
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const session = await client().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: input.orderId,
        metadata: {
          transactionId: input.transactionId,
          orderId: input.orderId,
        },
        payment_intent_data: {
          metadata: {
            transactionId: input.transactionId,
            orderId: input.orderId,
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amountMinor,
              product_data: {
                name: `OSRS Services order ${input.orderNumber}`,
              },
            },
          },
        ],
        success_url: `${base}/checkout/payment/${input.transactionId}/pending`,
        cancel_url: `${base}/checkout/payment/${input.transactionId}/pending?cancelled=1`,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      provider: "EXTERNAL_HOSTED_CHECKOUT",
      providerCheckoutId: session.id,
      providerPaymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      status: "REQUIRES_CUSTOMER_ACTION",
      redirectUrl: safeRedirect(session.url),
      safeMetadata: { processor: "stripe", liveMode: session.livemode },
    };
  },
  async retrievePayment(input) {
    if (!input.providerCheckoutId) throw new Error("Missing checkout session.");
    const session = await client().checkout.sessions.retrieve(
      input.providerCheckoutId,
    );
    return {
      provider: "EXTERNAL_HOSTED_CHECKOUT",
      providerPaymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      providerCheckoutId: session.id,
      status:
        session.payment_status === "paid"
          ? "PAID"
          : session.status === "expired"
            ? "EXPIRED"
            : "PENDING",
      amountMinor: session.amount_total,
      currency: session.currency?.toUpperCase() ?? null,
      createdAt: new Date(session.created * 1000),
      safeMetadata: { processor: "stripe", liveMode: session.livemode },
    };
  },
  async verifyWebhook(input) {
    if (!stripeConfigurationReady() || !input.signature)
      return { ok: false, failureCode: "STRIPE_NOT_CONFIGURED" };
    try {
      const event = client().webhooks.constructEvent(
        input.payload,
        input.signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
      const mapped = stripeCheckoutEvent(event);
      return mapped ? { ok: true, event: mapped } : { ok: true, ignored: true };
    } catch {
      return { ok: false, failureCode: "INVALID_STRIPE_EVENT" };
    }
  },
  async handleWebhookEvent(input) {
    return input.event;
  },
  async cancelPayment(input) {
    if (!input.providerCheckoutId) throw new Error("Missing checkout session.");
    const session = await client().checkout.sessions.expire(
      input.providerCheckoutId,
    );
    return {
      status: session.status === "expired" ? "EXPIRED" : "PENDING",
      safeMetadata: { processor: "stripe" },
    };
  },
  async requestRefund(input) {
    const payment = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: input.transactionId },
      select: { providerPaymentId: true, provider: true },
    });
    if (
      payment.provider !== "EXTERNAL_HOSTED_CHECKOUT" ||
      !payment.providerPaymentId
    )
      throw new Error("Missing Stripe payment reference.");
    const refund = await client().refunds.create(
      { payment_intent: payment.providerPaymentId, amount: input.amountMinor },
      { idempotencyKey: input.idempotencyKey },
    );
    return {
      status:
        refund.status === "succeeded"
          ? "SUCCEEDED"
          : refund.status === "failed" || refund.status === "canceled"
            ? "FAILED"
            : "PENDING",
      providerRefundId: refund.id,
      safeMetadata: { processor: "stripe" },
    };
  },
  async validateConfiguration() {
    const ready =
      stripeConfigurationReady() &&
      env.EXTERNAL_PAYMENTS_ENABLED &&
      env.PAYMENT_WEBHOOKS_ENABLED;
    return {
      ready,
      status: ready ? "READY" : "NOT_READY",
      safeMessage: ready
        ? "Stripe hosted checkout and signed webhook configuration are present. Verify in Stripe test mode before activating live checkout."
        : "Configure Stripe secret/webhook keys and enable the environment payment flags privately before activation.",
    };
  },
};
