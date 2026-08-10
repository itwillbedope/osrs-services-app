import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { createTestHostedWebhookFixture } from "@/lib/payments/adapters";
import { processPaymentWebhook } from "@/lib/payments/webhooks";

export const dynamic = "force-dynamic";

const fixtureSchema = z.object({
  transactionId: z.string().trim().min(1).max(30),
  eventType: z.enum([
    "payment.succeeded",
    "payment.failed",
    "payment.cancelled",
    "refund.succeeded",
  ]),
  failureReasonCode: z.string().trim().max(120).optional(),
});

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return json({ ok: false, message: "TEST_HOSTED is blocked." }, 404);
  }
  const parsed = fixtureSchema.safeParse(await request.json());
  if (!parsed.success) {
    return json({ ok: false, message: "Invalid TEST_HOSTED fixture." }, 400);
  }
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: parsed.data.transactionId },
    select: {
      id: true,
      provider: true,
      amountMinor: true,
      currencyCode: true,
    },
  });
  if (!payment || payment.provider !== "TEST_HOSTED") {
    return json(
      { ok: false, message: "TEST_HOSTED transaction not found." },
      404,
    );
  }
  const fixture = createTestHostedWebhookFixture({
    transactionId: payment.id,
    eventType: parsed.data.eventType,
    amountMinor: payment.amountMinor,
    currency: payment.currencyCode,
    providerPaymentId: `test_py_${payment.id}`,
    failureReasonCode: parsed.data.failureReasonCode,
  });
  const result = await processPaymentWebhook({
    providerRoute: "test-hosted",
    payload: fixture.payload,
    signature: fixture.signature,
  });
  return json({
    ok: true,
    eventId: fixture.fixture.eventId,
    webhook: result,
  });
}
