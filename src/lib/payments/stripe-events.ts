import type Stripe from "stripe";
import type { HostedWebhookFixture } from "@/lib/payments/core";

/** Map only verified Checkout events; a return URL never verifies payment. */
export function stripeCheckoutEvent(
  event: Stripe.Event,
): HostedWebhookFixture | null {
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ].includes(event.type)
  )
    return null;
  const session = event.data.object as Stripe.Checkout.Session;
  if (
    event.type === "checkout.session.completed" &&
    session.payment_status !== "paid"
  )
    return null;
  const transactionId = session.metadata?.transactionId;
  if (
    !transactionId ||
    !/^[a-zA-Z0-9_-]{1,30}$/.test(transactionId) ||
    !Number.isSafeInteger(session.amount_total) ||
    !session.currency
  )
    throw new Error("INVALID_CHECKOUT_EVENT");
  const succeeded =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded";
  return {
    eventId: event.id,
    eventType: succeeded
      ? "payment.succeeded"
      : event.type === "checkout.session.expired"
        ? "payment.cancelled"
        : "payment.failed",
    transactionId,
    providerPaymentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
    amountMinor: session.amount_total!,
    currency: session.currency.toUpperCase(),
    createdAt: new Date(event.created * 1000).toISOString(),
    status: succeeded
      ? "PAID"
      : event.type === "checkout.session.expired"
        ? "EXPIRED"
        : "FAILED",
  };
}
