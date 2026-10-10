import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireCapability } from "@/lib/auth/guards";
import { hasCapability } from "@/lib/auth/capabilities";
import { staffLandingPath } from "@/lib/auth/admin-workspace";
import { getBusinessDashboard } from "@/lib/admin/dashboard";
import {
  orderStatusLabels,
  orderPaymentStatusLabels,
} from "@/lib/checkout/constants";

export const metadata = { title: "Business dashboard" };
export const dynamic = "force-dynamic";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default async function AdminPage() {
  const session = await requireCapability("admin.access", "/admin");
  if (!hasCapability(session.capabilities, "dashboard.view")) {
    const destination = staffLandingPath(session.capabilities);
    if (destination) redirect(destination);
    forbidden();
  }
  const dashboard = await getBusinessDashboard();
  const stats: Array<[string, number]> = [
    ["Total orders", dashboard.orderCount],
    ["Orders this month (UTC)", dashboard.monthOrderCount],
    ["Open orders", dashboard.openOrderCount],
    ["Active customers", dashboard.activeCustomers],
  ];
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Business dashboard</h1>
          <p className="text-text-secondary mt-3">
            Sales and operations from your live order records.
          </p>
        </div>
        {hasCapability(session.capabilities, "users.manage") && (
          <Button asChild>
            <Link href="/admin/users">Users & roles</Link>
          </Button>
        )}
      </div>
      <section
        aria-label="Operational statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map(([label, value]) => (
          <article
            key={label}
            className="border-border bg-surface-1 rounded-xl border p-5"
          >
            <h2 className="text-text-secondary text-sm">{label}</h2>
            <p className="mt-3 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>
      <section className="border-border bg-surface-1 space-y-5 rounded-xl border p-5 sm:p-6">
        <h2 className="text-xl font-bold">Confirmed sales</h2>
        <p className="text-text-secondary text-sm">
          All-time paid orders, less successful recorded refunds. Currencies are
          kept separate. Pending payments are excluded; these totals are not
          profit or bank settlement balances.
        </p>
        {dashboard.sales.length === 0 ? (
          <p>No confirmed sales yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.sales.map((sale) => (
              <article
                key={sale.currencyCode}
                className="border-border rounded-lg border p-4"
              >
                <h3 className="font-bold">
                  {sale.currencyCode} · {sale.paidOrders} paid orders
                </h3>
                <dl className="mt-4 space-y-3">
                  {[
                    { label: "Gross paid sales", cents: sale.grossCents },
                    { label: "Recorded refunds", cents: sale.refundCents },
                    { label: "Net paid sales", cents: sale.netCents },
                  ].map(({ label, cents }) => (
                    <div
                      key={label}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <dt>{label}</dt>
                      <dd className="font-bold">
                        {money(cents, sale.currencyCode)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="border-border bg-surface-1 rounded-xl border p-5">
          <h2 className="text-xl font-bold">Order status</h2>
          <ul className="mt-4 space-y-3">
            {dashboard.statuses.map((row) => (
              <li key={row.status} className="flex justify-between gap-3">
                <span>{orderStatusLabels[row.status]}</span>
                <strong>{row._count._all}</strong>
              </li>
            ))}
          </ul>
          {!dashboard.statuses.length && <p className="mt-4">No orders yet.</p>}
        </div>
        <div className="border-border bg-surface-1 min-w-0 rounded-xl border p-5">
          <h2 className="text-xl font-bold">Recent orders</h2>
          <div className="mt-4 space-y-4">
            {dashboard.recentOrders.map((order) => (
              <article
                key={order.id}
                className="border-border flex flex-wrap justify-between gap-3 border-b pb-3"
              >
                <div>
                  {hasCapability(session.capabilities, "orders.view") ? (
                    <Link
                      className="text-primary font-bold"
                      href={`/admin/orders/${order.id}`}
                    >
                      {order.orderNumber}
                    </Link>
                  ) : (
                    <strong>{order.orderNumber}</strong>
                  )}
                  <p className="text-text-secondary mt-1 text-sm">
                    {orderStatusLabels[order.status]} ·{" "}
                    {orderPaymentStatusLabels[order.paymentStatus]}
                  </p>
                </div>
                <strong>
                  {money(order.finalTotalCents, order.currencyCode)}
                </strong>
              </article>
            ))}
          </div>
          {!dashboard.recentOrders.length && (
            <p className="mt-4">No orders yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
