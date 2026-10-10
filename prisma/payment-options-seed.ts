import type { PrismaClient } from "../src/generated/prisma/client";
export async function seedPaymentOptions(prisma: PrismaClient) {
  const settings = await prisma.checkoutSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!settings) return;
  const stripe = await prisma.paymentProviderConfiguration.upsert({
    where: { stableKey: "provider-stripe" },
    create: {
      stableKey: "provider-stripe",
      provider: "EXTERNAL_HOSTED_CHECKOUT",
      displayName: "Stripe",
      enabled: false,
      productionAllowed: false,
      webhookEnabled: false,
      healthStatus: "NOT_READY",
      publicMode: "pending-configuration",
      needsClientReview: true,
    },
    update: {},
  });
  for (const [
    stableKey,
    publicName,
    publicDescription,
    publicInstructions,
    sortOrder,
  ] of [
    [
      "stripe-checkout",
      "Stripe · Cards",
      "Pay securely on Stripe's hosted checkout.",
      "Complete payment on the secure Stripe checkout page. Your order is paid only after server verification.",
      10,
    ],
    [
      "payoneer-review",
      "Payoneer",
      "Payoneer payment arranged and verified by support.",
      "SETUP REQUIRED: configure Payoneer payment instructions before enabling this method.",
      20,
    ],
    [
      "bitcoin-review",
      "Bitcoin (BTC)",
      "Bitcoin payment with an order-specific quote and staff verification.",
      "SETUP REQUIRED: configure Bitcoin invoicing, network and confirmation instructions before enabling this method.",
      30,
    ],
    [
      "osrs-gp-review",
      "OSRS GP",
      "Pay with OSRS gold at a rate confirmed before trading.",
      "SETUP REQUIRED: configure GP quote and trade instructions before enabling this method.",
      40,
    ],
  ] as const) {
    await prisma.checkoutPaymentMethod.upsert({
      where: { stableKey },
      create: {
        stableKey,
        settingsId: settings.id,
        publicName,
        publicDescription,
        publicInstructions,
        sortOrder,
        enabled: false,
        needsClientReview: true,
        methodType:
          stableKey === "stripe-checkout"
            ? "EXTERNAL_HOSTED_CHECKOUT"
            : "MANUAL_REVIEW",
        providerType:
          stableKey === "stripe-checkout"
            ? "EXTERNAL_HOSTED_CHECKOUT"
            : "MANUAL_REVIEW",
        providerConfigId:
          stableKey === "stripe-checkout" ? stripe.id : undefined,
      },
      update: {},
    });
  }
}
