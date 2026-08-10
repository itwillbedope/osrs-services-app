import { NextRequest, NextResponse } from "next/server";

import {
  processPaymentWebhook,
  sanitizePaymentWebhookError,
} from "@/lib/payments/webhooks";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  try {
    const payload = await request.text();
    const signature =
      request.headers.get("x-test-hosted-signature") ??
      request.headers.get("x-payment-signature");
    const result = await processPaymentWebhook({
      providerRoute: provider,
      payload,
      signature,
    });
    return json({ ...result, ok: true });
  } catch (error) {
    const safe = sanitizePaymentWebhookError(error);
    return json({ ok: false, message: safe.message }, safe.status);
  }
}
