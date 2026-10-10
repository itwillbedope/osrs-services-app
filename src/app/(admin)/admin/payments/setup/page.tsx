import Link from "next/link";
import { requireCapability } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";
import { stripeHostedAdapter } from "@/lib/payments/stripe";
import { Button } from "@/components/ui/button";
import { updateStripeSetupAction } from "./actions";
export const dynamic = "force-dynamic";
export default async function PaymentSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireCapability("payments.configure", "/admin/payments/setup");
  const [state, configuration, readiness] = await Promise.all([
    searchParams,
    prisma.paymentProviderConfiguration.findUnique({
      where: { stableKey: "provider-stripe" },
    }),
    stripeHostedAdapter.validateConfiguration(),
  ]);
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <h1 className="text-3xl font-bold">Payment setup</h1>
      <p>
        Connect your existing merchant accounts when you are ready. Production
        keys belong in Hostinger environment variables.
      </p>
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      {state.saved && <p role="status">Configuration saved.</p>}
      <section className="border-border bg-surface-1 space-y-4 rounded-xl border p-6">
        <h2 className="text-xl font-bold">Stripe hosted checkout</h2>
        <p>{readiness.safeMessage}</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Secret key: {env.STRIPE_SECRET_KEY ? "Present" : "Missing"}</li>
          <li>
            Webhook secret: {env.STRIPE_WEBHOOK_SECRET ? "Present" : "Missing"}
          </li>
          <li>
            External payments environment flag:{" "}
            {env.EXTERNAL_PAYMENTS_ENABLED ? "Enabled" : "Disabled"}
          </li>
          <li>
            Webhook environment flag:{" "}
            {env.PAYMENT_WEBHOOKS_ENABLED ? "Enabled" : "Disabled"}
          </li>
        </ul>
        <p>
          Webhook endpoint: <code>/api/payments/webhooks/stripe</code>.
          Subscribe to Checkout session completed, async payment succeeded,
          async payment failed and expired events. Run a Stripe test payment and
          verify the order before switching to live keys.
        </p>
        <form action={updateStripeSetupAction} className="grid gap-4">
          <label>
            <input
              type="checkbox"
              name="merchantConfirmed"
              defaultChecked={!configuration?.needsClientReview}
            />{" "}
            I confirmed merchant approval for the service categories and
            verified Stripe test checkout and webhook delivery.
          </label>
          <label>
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={configuration?.enabled}
            />{" "}
            Enable Stripe checkout
          </label>
          <Button type="submit">Save Stripe settings</Button>
        </form>
      </section>
      {[
        [
          "Payoneer",
          "Configure an approved Payoneer Checkout integration or order-specific payment request instructions. The current option uses support verification; it does not claim an automatic Payoneer gateway connection.",
        ],
        [
          "Bitcoin (BTC)",
          "Configure your invoice provider or receiving instructions, Bitcoin network, quote expiry and required confirmations. Staff verifies payment before marking an order paid; no wallet address or private key is invented.",
        ],
        [
          "OSRS GP",
          "Set trade instructions and confirm the GP amount and exchange rate for each order before trading. Staff records the confirmed payment against the order.",
        ],
      ].map(([name, text]) => (
        <section
          key={name}
          className="border-border bg-surface-1 space-y-3 rounded-xl border p-6"
        >
          <h2 className="text-xl font-bold">{name}</h2>
          <p>{text}</p>
          <Link
            className="text-primary underline"
            href="/admin/checkout/payment-methods"
          >
            Edit instructions and availability
          </Link>
        </section>
      ))}
      <p>
        All four options were initialized disabled. Existing manual review
        remains available. A payment return page never marks an order paid.
      </p>
    </main>
  );
}
