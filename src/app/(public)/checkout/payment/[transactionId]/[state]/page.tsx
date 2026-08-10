import { Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  paymentProviderLabels,
  paymentTransactionStatusLabels,
} from "@/lib/payments/constants";
import { getPublicPaymentTransaction } from "@/lib/payments/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

function formatMinor(amountMinor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

const stateCopy = {
  pending: {
    badge: "Payment pending",
    title: "Payment verification pending",
    body: "The hosted checkout return does not mark an order paid. Payment status updates only after server-side provider verification.",
    Icon: Clock3,
  },
  success: {
    badge: "Return received",
    title: "Payment return received",
    body: "The provider return was received. The order is paid only when the verified webhook updates the server transaction.",
    Icon: ShieldCheck,
  },
  failure: {
    badge: "Payment update",
    title: "Payment could not be verified",
    body: "Payment was not confirmed. No resources are consumed from this redirect page.",
    Icon: TriangleAlert,
  },
} as const;

export default async function PublicPaymentStatusPage({
  params,
}: {
  params: Promise<{ transactionId: string; state: string }>;
}) {
  const { transactionId, state } = await params;
  if (!["pending", "success", "failure"].includes(state)) notFound();
  const payment = await getPublicPaymentTransaction(transactionId);
  if (!payment) notFound();
  const copy = stateCopy[state as keyof typeof stateCopy];
  const Icon = copy.Icon;

  return (
    <main id="main-content" className="min-h-[70vh]">
      <section className="border-border bg-surface-1 border-b py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Badge variant={payment.status === "PAID" ? "success" : "warning"}>
            {copy.badge}
          </Badge>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Icon className="text-primary size-10" aria-hidden="true" />
            <h1 className="display-type text-4xl sm:text-5xl">{copy.title}</h1>
          </div>
          <p className="text-text-secondary mt-4 max-w-2xl leading-7">
            {copy.body}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-10 sm:px-8 md:grid-cols-2">
        <article className="border-border bg-surface-1 rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Order</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Order number</dt>
              <dd className="font-bold">{payment.order.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Order status</dt>
              <dd>{payment.order.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Payment status</dt>
              <dd>{payment.order.paymentStatus}</dd>
            </div>
          </dl>
        </article>

        <article className="border-border bg-surface-1 rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Payment</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Provider</dt>
              <dd>{paymentProviderLabels[payment.provider]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Status</dt>
              <dd>{paymentTransactionStatusLabels[payment.status]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Amount</dt>
              <dd className="font-bold">
                {formatMinor(payment.amountMinor, payment.currencyCode)}
              </dd>
            </div>
          </dl>
        </article>

        <div className="md:col-span-2">
          <Button asChild variant="secondary">
            <Link href="/support">Contact support</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
