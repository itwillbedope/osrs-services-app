import "server-only";

import { createHmac } from "node:crypto";

import type { EmailTemplateType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  renderEmailTemplate,
  type EmailTemplateVariables,
} from "@/lib/email/templates";
import {
  emailTransportConfiguration,
  sendEmailMessage,
} from "@/lib/email/transport";
import { env } from "@/lib/env";

function safeJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function recipientHash(email: string) {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(email.trim().toLowerCase(), "utf8")
    .digest("hex");
}

function deliveryStatusForConfiguration() {
  const config = emailTransportConfiguration();
  if (!config.enabled) return "SUPPRESSED_DISABLED" as const;
  if (config.transport === "SMTP" && !config.smtpConfigured) {
    return "SUPPRESSED_NOT_CONFIGURED" as const;
  }
  return "PENDING" as const;
}

export async function createEmailDeliveryRecord({
  transaction,
  templateType,
  recipientEmail,
  subject,
  dedupeKey,
  orderId,
  userId,
  customerNotificationId,
  orderOutboxId,
  safeMetadata,
}: {
  transaction?: Prisma.TransactionClient;
  templateType: EmailTemplateType;
  recipientEmail: string;
  subject: string;
  dedupeKey: string;
  orderId?: string | null;
  userId?: string | null;
  customerNotificationId?: string | null;
  orderOutboxId?: string | null;
  safeMetadata?: Record<string, unknown>;
}) {
  const client = transaction ?? prisma;
  const template = await client.emailTemplate.findFirst({
    where: { templateType, enabled: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return client.emailDelivery.upsert({
    where: { dedupeKey },
    create: {
      templateId: template?.id ?? null,
      templateType,
      transport: emailTransportConfiguration().transport,
      status: deliveryStatusForConfiguration(),
      dedupeKey,
      recipientHash: recipientHash(recipientEmail),
      orderId: orderId ?? null,
      userId: userId ?? null,
      customerNotificationId: customerNotificationId ?? null,
      orderOutboxId: orderOutboxId ?? null,
      subject: subject.slice(0, 240),
      safeMetadata: safeMetadata
        ? safeJson({
            ...safeMetadata,
            emailDeliveryEnabled: emailTransportConfiguration().enabled,
          })
        : safeJson({
            emailDeliveryEnabled: emailTransportConfiguration().enabled,
          }),
    },
    update: {},
  });
}

export async function sendTransactionalEmailNow(input: {
  templateType: EmailTemplateType;
  recipientEmail: string;
  variables: EmailTemplateVariables;
  dedupeKey: string;
  orderId?: string | null;
  userId?: string | null;
  safeMetadata?: Record<string, unknown>;
}) {
  const template = await prisma.emailTemplate.findFirst({
    where: { templateType: input.templateType, enabled: true },
    orderBy: { createdAt: "asc" },
  });
  if (!template) {
    return createEmailDeliveryRecord({
      templateType: input.templateType,
      recipientEmail: input.recipientEmail,
      subject: input.templateType,
      dedupeKey: input.dedupeKey,
      orderId: input.orderId,
      userId: input.userId,
      safeMetadata: { ...(input.safeMetadata ?? {}), templateMissing: true },
    });
  }
  const rendered = renderEmailTemplate({
    subject: template.subject,
    htmlBody: template.htmlBody,
    textBody: template.textBody,
    variables: input.variables,
  });
  const delivery = await createEmailDeliveryRecord({
    templateType: input.templateType,
    recipientEmail: input.recipientEmail,
    subject: rendered.subject,
    dedupeKey: input.dedupeKey,
    orderId: input.orderId,
    userId: input.userId,
    safeMetadata: input.safeMetadata,
  });
  if (delivery.status !== "PENDING") return delivery;
  const result = await sendEmailMessage({
    to: input.recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  return prisma.emailDelivery.update({
    where: { id: delivery.id },
    data: {
      status: result.sent ? "SENT" : "FAILED",
      externalMessageId: result.externalMessageId,
      deliveryAttemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      sentAt: result.sent ? new Date() : null,
      failedAt: result.sent ? null : new Date(),
      lastFailureCode: result.failureCode,
      safeMetadata: safeJson({
        ...(input.safeMetadata ?? {}),
        externalCallCount: result.externalCallCount,
      }),
    },
  });
}

export async function queueOrderEmailDelivery({
  transaction,
  templateType,
  orderId,
  recipientEmail,
  orderNumber,
  subject,
  dedupeKey,
  orderOutboxId,
  safeMetadata,
}: {
  transaction: Prisma.TransactionClient;
  templateType: EmailTemplateType;
  orderId: string;
  recipientEmail: string;
  orderNumber: string;
  subject: string;
  dedupeKey: string;
  orderOutboxId?: string | null;
  safeMetadata?: Record<string, unknown>;
}) {
  return createEmailDeliveryRecord({
    transaction,
    templateType,
    recipientEmail,
    subject,
    dedupeKey,
    orderId,
    orderOutboxId,
    safeMetadata: {
      orderNumber,
      ...(safeMetadata ?? {}),
    },
  });
}
