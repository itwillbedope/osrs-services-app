import { CreditCard, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCapability } from "@/lib/auth/guards";
import {
  paymentProviderLabels,
  paymentTransactionStatusLabels,
  refundStatusLabels,
} from "@/lib/payments/constants";
import { getAdminPaymentTransactions } from "@/lib/payments/admin";

export const metadata: Metadata = { title: "Admin payments" };

function formatMinor(amountMinor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminPaymentsPage() {
  await requireCapability("payments.view", "/admin/payments");
  const payments = await getAdminPaymentTransactions();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge variant="info">Task 016</Badge>
          <h1 className="display-type mt-4 text-4xl font-black uppercase sm:text-5xl">
            Payments
          </h1>
          <p className="text-text-secondary mt-3 max-w-2xl text-sm leading-6">
            Provider-neutral transaction history, safe provider references,
            manual review and refund readiness.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/admin/checkout/payment-eligibility">
            Payment eligibility
          </Link>
        </Button>
      </div>

      <section className="border-border bg-surface-1 mt-8 overflow-hidden rounded-2xl border">
        {payments.length === 0 ? (
          <div className="grid place-items-center p-10 text-center">
            <CreditCard className="text-primary size-10" aria-hidden="true" />
            <p className="mt-4 font-bold">No payment transactions yet.</p>
            <p className="text-text-muted mt-2 text-sm">
              Checkout creates transactions after cart and checkout flags are
              enabled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] text-left text-sm">
              <thead className="border-border bg-surface-2 border-b">
                <tr>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Refunds</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Open</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.id}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {payment.order.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      {paymentProviderLabels[payment.provider]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="warning">
                        {paymentTransactionStatusLabels[payment.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {formatMinor(payment.amountMinor, payment.currencyCode)}
                    </td>
                    <td className="px-4 py-3">
                      {payment.refunds.length
                        ? payment.refunds
                            .map(
                              (refund) =>
                                `${refundStatusLabels[refund.status]} ${formatMinor(
                                  refund.amountMinor,
                                  payment.currencyCode,
                                )}`,
                            )
                            .join(", ")
                        : "None"}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/payments/${payment.id}`}>
                          <ExternalLink className="size-4" aria-hidden="true" />
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
