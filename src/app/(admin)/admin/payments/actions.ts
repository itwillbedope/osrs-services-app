"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/guards";
import {
  eligibilityUpdateSchema,
  updatePaymentEligibilityRule,
} from "@/lib/payments/admin";
import {
  requestPaymentRefund,
  sanitizePaymentError,
} from "@/lib/payments/refunds";
import { normalizePlainText } from "@/lib/checkout/security";

function destination(
  pathname: string,
  state: "saved" | "error",
  message: string,
) {
  const params = new URLSearchParams({ state, message });
  return `${pathname}?${params.toString()}`;
}

const transactionIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9]+$/i);

const refundSchema = z.object({
  transactionId: transactionIdSchema,
  amountMinor: z.coerce.number().int().positive(),
  reasonCode: z.string().trim().min(3).max(80),
  safeNote: z.unknown().optional(),
});

export async function updatePaymentEligibilityAction(formData: FormData) {
  const path = "/admin/checkout/payment-eligibility";
  const session = await requireCapability("payments.eligibility.manage", path);
  try {
    const parsed = eligibilityUpdateSchema.parse({
      id: formData.get("id"),
      mode: formData.get("mode"),
      safeReason: formData.get("safeReason"),
      merchantConfirmed: formData.get("merchantConfirmed") === "on",
      needsClientReview: formData.get("needsClientReview") === "on",
      expectedVersion: formData.get("expectedVersion"),
    });
    await updatePaymentEligibilityRule({
      ...parsed,
      actorId: session.user.id,
    });
  } catch (error) {
    redirect(
      destination(
        path,
        "error",
        error instanceof Error
          ? error.message
          : "Eligibility could not be saved.",
      ),
    );
  }
  revalidatePath(path);
  redirect(destination(path, "saved", "Payment eligibility updated."));
}

export async function requestPaymentRefundAction(formData: FormData) {
  const parsed = refundSchema.parse({
    transactionId: formData.get("transactionId"),
    amountMinor: formData.get("amountMinor"),
    reasonCode: formData.get("reasonCode"),
    safeNote: formData.get("safeNote"),
  });
  const path = `/admin/payments/${parsed.transactionId}`;
  const session = await requireCapability("payments.refund", path);
  try {
    await requestPaymentRefund({
      transactionId: parsed.transactionId,
      amountMinor: parsed.amountMinor,
      reasonCode: parsed.reasonCode,
      safeNote: normalizePlainText(parsed.safeNote ?? "", 500),
      actorId: session.user.id,
      idempotencyKey: `admin-refund-${randomUUID()}`,
    });
  } catch (error) {
    const safe = sanitizePaymentError(error);
    redirect(destination(path, "error", safe.message));
  }
  revalidatePath(path);
  redirect(destination(path, "saved", "Refund request recorded."));
}
