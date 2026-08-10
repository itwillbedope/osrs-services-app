import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCapability } from "@/lib/auth/guards";
import {
  getLaunchReadinessSettings,
  getPaymentEligibilityRules,
  getPaymentProviderConfigurations,
  paymentFeatureFlagSummary,
} from "@/lib/payments/admin";

export const metadata: Metadata = { title: "Launch readiness" };

const statusVariant = {
  READY: "success",
  NOT_READY: "danger",
  DISABLED: "neutral",
  NEEDS_CLIENT_REVIEW: "warning",
} as const;

export default async function LaunchReadinessPage() {
  await requireCapability("payments.view", "/admin/launch-readiness");
  const [settings, providers, eligibility, flags] = await Promise.all([
    getLaunchReadinessSettings(),
    getPaymentProviderConfigurations(),
    getPaymentEligibilityRules(),
    paymentFeatureFlagSummary(),
  ]);
  const reviewCount = eligibility.filter(
    (rule) => rule.needsClientReview,
  ).length;
  const providerAllowed = eligibility.filter(
    (rule) => rule.mode === "PROVIDER_ALLOWED" && !rule.needsClientReview,
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="warning">Production gate</Badge>
          <h1 className="display-type mt-4 text-4xl font-black uppercase sm:text-5xl">
            Launch readiness
          </h1>
          <p className="text-text-secondary mt-3 max-w-3xl text-sm leading-6">
            Safe operational status for production preparation. Secrets,
            provider credentials and raw payloads are intentionally not shown.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/admin/payments">Payments</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/checkout/payment-eligibility">Eligibility</Link>
          </Button>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {settings.map((setting) => (
          <article
            key={setting.id}
            className="border-border bg-surface-1 rounded-2xl border p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <Badge variant={statusVariant[setting.status]}>
                {setting.status}
              </Badge>
              {setting.status === "READY" ? (
                <CheckCircle2
                  className="text-success size-5"
                  aria-hidden="true"
                />
              ) : (
                <CircleAlert
                  className="text-warning size-5"
                  aria-hidden="true"
                />
              )}
            </div>
            <h2 className="mt-4 font-bold">{setting.label}</h2>
            <p className="text-text-muted mt-2 text-sm">{setting.category}</p>
            <p className="text-text-secondary mt-3 text-sm leading-6">
              {setting.safeSummary}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <article className="border-border bg-surface-1 rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Feature flags</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            {Array.from(flags.entries()).map(([key, enabled]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="font-mono text-xs">{key}</dt>
                <dd>{enabled ? "Enabled" : "Disabled"}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="border-border bg-surface-1 rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Payment providers</h2>
          <div className="mt-4 grid gap-3 text-sm">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="border-border rounded-xl border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={provider.enabled ? "success" : "neutral"}>
                    {provider.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant={statusVariant[provider.healthStatus]}>
                    {provider.healthStatus}
                  </Badge>
                </div>
                <p className="mt-2 font-bold">{provider.displayName}</p>
                <p className="text-text-muted">
                  {provider.productionAllowed
                    ? "Production allowed"
                    : "Production blocked"}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border-border bg-surface-1 rounded-2xl border p-5">
          <h2 className="text-xl font-bold">Required reviews</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Eligibility needing review</dt>
              <dd className="font-bold">{reviewCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Provider-allowed sources</dt>
              <dd className="font-bold">{providerAllowed}</dd>
            </div>
          </dl>
          <p className="text-text-secondary mt-4 text-sm leading-6">
            Gold, items, accounts and account-service categories must not become
            provider-enabled until the merchant confirms processor eligibility.
          </p>
        </article>
      </section>
    </main>
  );
}
