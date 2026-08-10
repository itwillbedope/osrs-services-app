import "dotenv/config";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/db/prisma";
import { sendTransactionalEmailNow } from "../src/lib/email/delivery";
import { createTestHostedWebhookFixture } from "../src/lib/payments/adapters";
import { signTestHostedPayload } from "../src/lib/payments/core";
import { requestPaymentRefund } from "../src/lib/payments/refunds";
import { processPaymentWebhook } from "../src/lib/payments/webhooks";

const outputDirectory = path.join(process.cwd(), "artifacts", "task-016");
const guestId = "task016payguest";
const orderId = "task016payorder";
const transactionId = "task016paytxn";
const trackingHash = hash("task016 tracking token");
const checkoutHash = hash("task016 checkout idempotency");

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function setFlag(key: string, enabled: boolean) {
  await prisma.featureFlag.update({
    where: { key },
    data: { enabled },
  });
}

async function cleanup() {
  await prisma.paymentRefund.deleteMany({ where: { transactionId } });
  await prisma.paymentWebhookEvent.deleteMany({ where: { transactionId } });
  await prisma.paymentTransactionEvent.deleteMany({
    where: { transactionId },
  });
  await prisma.paymentTransaction.deleteMany({ where: { id: transactionId } });
  await prisma.emailDelivery.deleteMany({
    where: { dedupeKey: { contains: "task016" } },
  });
  await prisma.orderNotificationOutbox.deleteMany({ where: { orderId } });
  await prisma.orderPaymentEvent.deleteMany({ where: { orderId } });
  await prisma.orderStatusEvent.deleteMany({ where: { orderId } });
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.guestOrderContact.deleteMany({ where: { id: guestId } });
}

async function createFixtureOrder() {
  const method = await prisma.checkoutPaymentMethod.findFirstOrThrow({
    where: { stableKey: "test-hosted-checkout" },
    select: { id: true },
  });
  await prisma.checkoutPaymentMethod.update({
    where: { id: method.id },
    data: { enabled: true },
  });
  await prisma.guestOrderContact.create({
    data: {
      id: guestId,
      displayName: "Task 016 Payment Fixture",
      email: "task016-payment@example.test",
      consentAt: new Date(),
      termsVersion: "task016-review",
      privacyPolicyVersion: "task016-review",
    },
  });
  await prisma.order.create({
    data: {
      id: orderId,
      orderNumber: "T016-PAY-001",
      guestContactId: guestId,
      paymentMethodId: method.id,
      trackingTokenHash: trackingHash,
      checkoutIdempotencyKeyHash: checkoutHash,
      status: "AWAITING_PAYMENT",
      paymentStatus: "AWAITING_PAYMENT",
      paymentMethodType: "EXTERNAL_HOSTED_CHECKOUT",
      paymentProvider: "TEST_HOSTED",
      currencyCode: "USD",
      subtotalCents: 1299,
      adjustmentTotalCents: 0,
      finalTotalCents: 1299,
      termsVersion: "task016-review",
      privacyPolicyVersion: "task016-review",
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      id: transactionId,
      orderId,
      provider: "TEST_HOSTED",
      providerCheckoutId: "test_ch_task016",
      transactionType: "PAYMENT",
      status: "PENDING",
      currencyCode: "USD",
      amountMinor: 1299,
      idempotencyKeyHash: hash("task016 payment idempotency"),
      safeMetadata: { fixture: true },
      events: {
        create: {
          previousStatus: null,
          newStatus: "PENDING",
          eventType: "CI_FIXTURE_CREATED",
          sequence: 1,
          source: "TASK016_VALIDATION",
        },
      },
    },
  });
}

async function signedPayload(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  return {
    payload,
    signature: signTestHostedPayload(
      payload,
      process.env.TEST_HOSTED_PAYMENT_SECRET || process.env.AUTH_SECRET || "",
    ),
  };
}

async function main() {
  const originalFlags = new Map(
    (
      await prisma.featureFlag.findMany({
        where: {
          key: {
            in: [
              "payment_webhooks_enabled",
              "payment_refunds_enabled",
              "external_payments_enabled",
            ],
          },
        },
        select: { key: true, enabled: true },
      })
    ).map((flag) => [flag.key, flag.enabled]),
  );
  try {
    await cleanup();
    await createFixtureOrder();
    await setFlag("payment_webhooks_enabled", true);
    await setFlag("payment_refunds_enabled", true);

    const success = createTestHostedWebhookFixture({
      transactionId,
      eventType: "payment.succeeded",
      amountMinor: 1299,
      currency: "USD",
      providerPaymentId: "test_py_task016",
    });
    const successResult = await processPaymentWebhook({
      providerRoute: "test-hosted",
      payload: success.payload,
      signature: success.signature,
    });
    const duplicateResult = await processPaymentWebhook({
      providerRoute: "test-hosted",
      payload: success.payload,
      signature: success.signature,
    });
    const mismatch = await signedPayload({
      eventId: "evt_task016_mismatch",
      eventType: "payment.succeeded",
      transactionId,
      providerPaymentId: "test_py_task016_mismatch",
      amountMinor: 1300,
      currency: "USD",
      status: "PAID",
      createdAt: new Date().toISOString(),
    });
    const mismatchResult = await processPaymentWebhook({
      providerRoute: "test-hosted",
      payload: mismatch.payload,
      signature: mismatch.signature,
    });
    const unknown = await signedPayload({
      eventId: "evt_task016_unknown",
      eventType: "payment.succeeded",
      transactionId: "missing-task016-transaction",
      providerPaymentId: "test_py_task016_unknown",
      amountMinor: 1299,
      currency: "USD",
      status: "PAID",
      createdAt: new Date().toISOString(),
    });
    const unknownResult = await processPaymentWebhook({
      providerRoute: "test-hosted",
      payload: unknown.payload,
      signature: unknown.signature,
    });

    const admin = await prisma.user.findFirstOrThrow({
      where: { accountType: "STAFF" },
      select: { id: true },
    });
    const refund = await requestPaymentRefund({
      transactionId,
      amountMinor: 499,
      reasonCode: "TASK016_CI_REFUND",
      safeNote: "Task 016 validation partial refund.",
      actorId: admin.id,
      idempotencyKey: "task016-refund-key",
    });
    const refundDuplicate = await requestPaymentRefund({
      transactionId,
      amountMinor: 499,
      reasonCode: "TASK016_CI_REFUND",
      safeNote: "Task 016 validation partial refund retry.",
      actorId: admin.id,
      idempotencyKey: "task016-refund-key",
    });

    await sendTransactionalEmailNow({
      templateType: "VERIFY_EMAIL",
      recipientEmail: "task016-email@example.test",
      variables: {
        displayName: "Task 016 Email",
        verificationUrl: "https://example.test/verify/task016",
      },
      dedupeKey: "task016-email-verification",
      safeMetadata: { validation: "task016" },
    });

    const payment = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { order: true },
    });
    const paidEvents = await prisma.orderPaymentEvent.count({
      where: { orderId, newPaymentStatus: "PAID" },
    });
    const paymentReceivedEmails = await prisma.emailDelivery.count({
      where: { dedupeKey: `payment-received:${orderId}` },
    });
    const emailExternalCallRows = await prisma.emailDelivery.findMany({
      where: { dedupeKey: { startsWith: "task016" } },
      select: { safeMetadata: true },
    });
    const externalCallCount = emailExternalCallRows.reduce((total, row) => {
      const metadata = row.safeMetadata as {
        externalCallCount?: number;
      } | null;
      return total + Number(metadata?.externalCallCount ?? 0);
    }, 0);

    if (payment.order.paymentStatus !== "PAID") {
      throw new Error("Successful webhook did not mark the order paid.");
    }
    if (paidEvents !== 1) {
      throw new Error("Duplicate webhook produced duplicate paid events.");
    }
    if (paymentReceivedEmails !== 1) {
      throw new Error(
        "Duplicate webhook produced duplicate payment email rows.",
      );
    }
    if (!refund.idempotent && !refundDuplicate.idempotent) {
      throw new Error("Refund idempotency did not return the existing refund.");
    }
    if (externalCallCount !== 0) {
      throw new Error("TEST_EMAIL made an external email call.");
    }

    const lines = [
      "Task 016 payment and email validation",
      `Successful webhook processed: ${successResult.status}`,
      `Duplicate webhook result: ${duplicateResult.status}`,
      `Amount mismatch result: ${mismatchResult.status}`,
      `Unknown transaction result: ${unknownResult.status}`,
      `Order payment status after success: ${payment.order.paymentStatus}`,
      `Payment transaction status after refund: ${payment.status}`,
      `Paid order event count: ${paidEvents}`,
      `Payment received email rows: ${paymentReceivedEmails}`,
      `Refund duplicate idempotent: ${refundDuplicate.idempotent}`,
      `TEST_EMAIL external call count: ${externalCallCount}`,
      "No card data, provider credentials, SMTP passwords, raw tokens or raw webhook payloads were stored by this validation.",
    ];
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, "task016-payment-validation.txt"),
      `${lines.join("\n")}\n`,
      "utf8",
    );
    console.log(lines.join("\n"));
  } finally {
    for (const [key, enabled] of originalFlags) {
      await setFlag(key, enabled);
    }
    await prisma.$disconnect();
  }
}

main().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
