import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasCapability } from "@/lib/auth/capabilities";
import { requireCapability } from "@/lib/auth/guards";
import { getAdminPaymentTransaction } from "@/lib/payments/admin";
import {
  paymentProviderLabels,
  paymentTransactionStatusLabels,
  refundStatusLabels,
} from "@/lib/payments/constants";
import { requestPaymentRefundAction } from "../actions";

export const metadata: Metadata = { title: "Admin payment detail" };

function formatMinor(amountMinor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatDate(value: Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function stateBadge(state: "saved" | "error" | undefined, message?: string) {
  if (!state || !message) return null;
  return (
    <div
      className={
        state === "saved"
          ? "border-success/30 bg-success/10 text-success rounded-xl border p-4 text-sm"
          : "border-danger/30 bg-danger/10 text-danger rounded-xl border p-4 text-sm"
      }
      role="status"
    >
      {message}
    </div>
  );
}

export default async function AdminPaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { transactionId } = await params;
  const query = await searchParams;
  const session = await requireCapability(
    "payments.view",
    `/admin/payments/${transactionId}`,
  );
  const payment = await getAdminPaymentTransaction(transactionId);
  if (!payment) notFound();
  const canRefund = hasCapability(session.capabilities, "payments.refund");
  const state = Array.isArray(query.state) ? query.state[0] : query.state;
  const message = Array.isArray(query.message)
    ? query.message[0]
    : query.message;
  const refundedMinor = payment.refunds
    .filter((refund) => ["PENDING", "SUCCEEDED"].includes(refund.status))
    .reduce((total, refund) => total + refund.amountMinor, 0);
  const refundableMinor = Math.max(0, payment.amountMinor - refundedMinor);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="info">Payment detail</Badge>
          <h1 className="display-type mt-4 text-3xl font-black uppercase sm:text-5xl">
            {payment.id}
          </h1>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge variant="neutral">
              {paymentProviderLabels[payment.provider]}
            </Badge>
            <Badge variant="warning">
              {paymentTransactionStatusLabels[payment.status]}
            </Badge>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/admin/orders/${payment.orderId}`}>
            Open order {payment.order.orderNumber}
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        {stateBadge(state as "saved" | "error", message)}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-6">
          <section className="border-border bg-surface-1 rounded-2xl border p-5">
            <h2 className="text-xl font-bold">Transaction</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">Amount</dt>
                <dd className="font-bold">
                  {formatMinor(payment.amountMinor, payment.currencyCode)}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Provider checkout ref</dt>
                <dd className="font-mono text-xs">
                  {payment.providerCheckoutId ?? "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Provider payment ref</dt>
                <dd className="font-mono text-xs">
                  {payment.providerPaymentId ?? "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">Created</dt>
                <dd>{formatDate(payment.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Paid</dt>
                <dd>{formatDate(payment.paidAt)}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Refunded</dt>
                <dd>{formatDate(payment.refundedAt)}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Failure code</dt>
                <dd>{payment.failureReasonCode ?? "None"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Version</dt>
                <dd>{payment.concurrencyVersion}</dd>
              </div>
            </dl>
          </section>

          <section className="border-border bg-surface-1 rounded-2xl border p-5">
            <h2 className="text-xl font-bold">Event history</h2>
            <ol className="divide-border mt-3 divide-y text-sm">
              {payment.events.map((event) => (
                <li key={event.id} className="grid gap-1 py-3">
                  <strong>
                    {paymentTransactionStatusLabels[event.newStatus]}
                  </strong>
                  <span className="text-text-muted">
                    {event.eventType} via {event.source} at{" "}
                    {formatDate(event.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-border bg-surface-1 rounded-2xl border p-5">
            <h2 className="text-xl font-bold">Webhook events</h2>
            <div className="mt-3 grid gap-3 text-sm">
              {payment.webhookEvents.length === 0 ? (
                <p className="text-text-muted">No webhook events recorded.</p>
              ) : (
                payment.webhookEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border-border rounded-xl border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{event.status}</Badge>
                      <strong>{event.eventType}</strong>
                    </div>
                    <p className="text-text-muted mt-2">
                      Received {formatDate(event.receivedAt)}
                    </p>
                    {event.failureCode && <p>{event.failureCode}</p>}
                  </div>
                ))
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="border-border bg-surface-1 rounded-2xl border p-5">
            <h2 className="text-lg font-bold">Order</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-text-muted">Order number</dt>
                <dd className="font-bold">{payment.order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Customer</dt>
                <dd>{payment.order.guestContact.displayName}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Payment status</dt>
                <dd>{payment.order.paymentStatus}</dd>
              </div>
            </dl>
          </section>

          <section className="border-border bg-surface-1 rounded-2xl border p-5">
            <h2 className="text-lg font-bold">Refunds</h2>
            <div className="mt-3 grid gap-2 text-sm">
              {payment.refunds.length === 0 ? (
                <p className="text-text-muted">No refunds recorded.</p>
              ) : (
                payment.refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="border-border rounded-xl border p-3"
                  >
                    <strong>{refundStatusLabels[refund.status]}</strong>
                    <p>
                      {formatMinor(refund.amountMinor, refund.currencyCode)}
                    </p>
                    <p className="text-text-muted">{refund.reasonCode}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {canRefund && (
            <form
              action={requestPaymentRefundAction}
              className="border-border bg-surface-1 grid gap-4 rounded-2xl border p-5"
            >
              <input type="hidden" name="transactionId" value={payment.id} />
              <h2 className="text-lg font-bold">Request refund</h2>
              <label className="grid gap-1 text-xs font-semibold">
                Amount in cents
                <input
                  name="amountMinor"
                  type="number"
                  min={1}
                  max={refundableMinor}
                  defaultValue={refundableMinor}
                  className="border-border bg-background min-h-11 rounded-xl border px-3"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold">
                Reason code
                <input
                  name="reasonCode"
                  defaultValue="ADMIN_APPROVED_REFUND"
                  maxLength={80}
                  className="border-border bg-background min-h-11 rounded-xl border px-3"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold">
                Safe note
                <textarea
                  name="safeNote"
                  maxLength={500}
                  className="border-border bg-background min-h-20 rounded-xl border px-3 py-2"
                />
              </label>
              <Button type="submit" disabled={refundableMinor <= 0}>
                Request refund
              </Button>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}
