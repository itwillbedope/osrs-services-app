import { MailCheck } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { requireCapability } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { emailTransportConfiguration } from "@/lib/email/transport";

export const metadata: Metadata = { title: "Email delivery status" };

export default async function AdminEmailStatusPage() {
  await requireCapability("payments.view", "/admin/checkout/email");
  const [templates, deliveryCounts] = await Promise.all([
    prisma.emailTemplate.findMany({
      orderBy: [{ templateType: "asc" }, { version: "asc" }],
      select: {
        id: true,
        templateType: true,
        version: true,
        subject: true,
        enabled: true,
        needsClientReview: true,
      },
    }),
    prisma.emailDelivery.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);
  const config = emailTransportConfiguration();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div>
        <Badge variant={config.enabled ? "warning" : "neutral"}>
          {config.enabled ? "Configured review" : "Disabled"}
        </Badge>
        <h1 className="display-type mt-4 text-4xl font-black uppercase sm:text-5xl">
          Email delivery
        </h1>
        <p className="text-text-secondary mt-3 max-w-3xl text-sm leading-6">
          SMTP and TEST_EMAIL delivery foundation status. Passwords, raw tokens
          and message bodies are not displayed.
        </p>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <article className="border-border bg-surface-1 rounded-2xl border p-5">
          <MailCheck className="text-primary size-8" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold">Transport</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Delivery enabled</dt>
              <dd>{config.enabled ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Transport</dt>
              <dd>{config.transport}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>SMTP configured</dt>
              <dd>{config.smtpConfigured ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Sender configured</dt>
              <dd>{config.fromEmail ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </article>

        <article className="border-border bg-surface-1 rounded-2xl border p-5 lg:col-span-2">
          <h2 className="text-xl font-bold">Delivery counts</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {deliveryCounts.length === 0 ? (
              <Badge variant="neutral">No delivery rows</Badge>
            ) : (
              deliveryCounts.map((entry) => (
                <Badge key={entry.status} variant="info">
                  {entry.status}: {entry._count._all}
                </Badge>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="border-border bg-surface-1 mt-8 overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-border bg-surface-2 border-b">
              <tr>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3">{template.templateType}</td>
                  <td className="px-4 py-3">{template.version}</td>
                  <td className="px-4 py-3">{template.subject}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        template.needsClientReview ? "warning" : "success"
                      }
                    >
                      {template.needsClientReview
                        ? "Needs review"
                        : template.enabled
                          ? "Ready"
                          : "Disabled"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
