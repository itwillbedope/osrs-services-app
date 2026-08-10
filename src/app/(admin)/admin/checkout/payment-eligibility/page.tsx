import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasCapability } from "@/lib/auth/capabilities";
import { requireCapability } from "@/lib/auth/guards";
import { getPaymentEligibilityRules } from "@/lib/payments/admin";
import { paymentEligibilityModeLabels } from "@/lib/payments/constants";
import { updatePaymentEligibilityAction } from "../../payments/actions";

export const metadata: Metadata = { title: "Payment eligibility" };

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

export default async function PaymentEligibilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await requireCapability(
    "payments.view",
    "/admin/checkout/payment-eligibility",
  );
  const canManage = hasCapability(
    session.capabilities,
    "payments.eligibility.manage",
  );
  const rules = await getPaymentEligibilityRules();
  const state = Array.isArray(query.state) ? query.state[0] : query.state;
  const message = Array.isArray(query.message)
    ? query.message[0]
    : query.message;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div>
        <Badge variant="warning">Needs client review</Badge>
        <h1 className="display-type mt-4 text-4xl font-black uppercase sm:text-5xl">
          Payment eligibility
        </h1>
        <p className="text-text-secondary mt-3 max-w-3xl text-sm leading-6">
          External providers are blocked until the merchant confirms eligibility
          for the exact products and services sold. Manual review remains the
          fallback.
        </p>
      </div>

      <div className="mt-6">
        {stateBadge(state as "saved" | "error", message)}
      </div>

      <section className="mt-8 grid gap-4">
        {rules.map((rule) =>
          canManage ? (
            <form
              key={rule.id}
              action={updatePaymentEligibilityAction}
              className="border-border bg-surface-1 grid gap-4 rounded-2xl border p-5 lg:grid-cols-[minmax(0,1fr)_15rem_16rem_10rem]"
            >
              <input type="hidden" name="id" value={rule.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={rule.concurrencyVersion}
              />
              <div>
                <strong>{rule.sourceLabel}</strong>
                <p className="text-text-muted mt-1 font-mono text-xs">
                  {rule.sourceType} / {rule.sourceKey}
                </p>
                <textarea
                  name="safeReason"
                  defaultValue={rule.safeReason}
                  maxLength={500}
                  className="border-border bg-background mt-3 min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
                />
              </div>
              <label className="grid gap-1 text-xs font-semibold">
                Mode
                <select
                  name="mode"
                  defaultValue={rule.mode}
                  className="border-border bg-background min-h-11 rounded-xl border px-3"
                >
                  {Object.entries(paymentEligibilityModeLabels).map(
                    ([mode, label]) => (
                      <option key={mode} value={mode}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="grid content-start gap-3 text-sm">
                <label className="flex gap-2">
                  <input
                    name="merchantConfirmed"
                    type="checkbox"
                    defaultChecked={rule.merchantConfirmed}
                  />
                  Merchant confirmed
                </label>
                <label className="flex gap-2">
                  <input
                    name="needsClientReview"
                    type="checkbox"
                    defaultChecked={rule.needsClientReview}
                  />
                  Needs review
                </label>
              </div>
              <Button type="submit" size="sm" className="h-fit">
                Save
              </Button>
            </form>
          ) : (
            <article
              key={rule.id}
              className="border-border bg-surface-1 rounded-2xl border p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="warning">
                  {paymentEligibilityModeLabels[rule.mode]}
                </Badge>
                <span className="text-text-muted text-sm">
                  {rule.needsClientReview ? "Needs review" : "Reviewed"}
                </span>
              </div>
              <h2 className="mt-3 font-bold">{rule.sourceLabel}</h2>
              <p className="text-text-muted mt-1 font-mono text-xs">
                {rule.sourceType} / {rule.sourceKey}
              </p>
              <p className="text-text-secondary mt-3 text-sm leading-6">
                {rule.safeReason}
              </p>
            </article>
          ),
        )}
      </section>
    </main>
  );
}
