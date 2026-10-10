"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth/guards";
import { stripeHostedAdapter } from "@/lib/payments/stripe";
import { prisma } from "@/lib/db/prisma";
export async function updateStripeSetupAction(form: FormData) {
  const session = await requireCapability(
    "payments.configure",
    "/admin/payments/setup",
  );
  const enabled = form.get("enabled") === "on";
  const reviewed = form.get("merchantConfirmed") === "on";
  const readiness = await stripeHostedAdapter.validateConfiguration();
  if (enabled && (!readiness.ready || !reviewed))
    redirect(
      "/admin/payments/setup?error=Configure+the+private+environment+settings+and+confirm+merchant+approval+first.",
    );
  await prisma.$transaction(async (tx) => {
    await tx.paymentProviderConfiguration.update({
      where: { stableKey: "provider-stripe" },
      data: {
        enabled,
        productionAllowed: enabled && reviewed,
        webhookEnabled: enabled,
        healthStatus: readiness.ready ? "READY" : "NOT_READY",
        needsClientReview: !reviewed,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        concurrencyVersion: { increment: 1 },
      },
    });
    await tx.checkoutPaymentMethod.update({
      where: { stableKey: "stripe-checkout" },
      data: {
        enabled,
        needsClientReview: !reviewed,
        concurrencyVersion: { increment: 1 },
      },
    });
    for (const key of [
      "external_payments_enabled",
      "payment_webhooks_enabled",
    ]) {
      await tx.featureFlag.update({ where: { key }, data: { enabled } });
    }
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "payments.stripe.configuration.updated",
        targetType: "PaymentProviderConfiguration",
        metadata: { enabled, merchantConfirmed: reviewed },
      },
    });
  });
  revalidatePath("/admin/payments/setup");
  revalidatePath("/checkout");
  redirect("/admin/payments/setup?saved=1");
}
