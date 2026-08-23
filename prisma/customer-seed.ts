import type { PrismaClient } from "../src/generated/prisma/client";

export async function seedCustomerAccounts(prisma: PrismaClient) {
  await prisma.customerAccountSettings.upsert({
    where: { stableKey: "customer-accounts-default-settings" },
    create: {
      stableKey: "customer-accounts-default-settings",
      registrationEnabled: true,
      dashboardEnabled: true,
      emailVerificationRequired: false,
      passwordRecoveryEnabled: false,
      customerSessionDurationHours: 168,
      maximumActiveCustomerSessions: 5,
      publicRegistrationInstructions:
        "Customer accounts are enabled for production preview. Email delivery remains disabled until SMTP is configured.",
      publicRecoveryInstructions:
        "Password recovery is prepared without live email delivery. Do not claim that recovery email was sent until a provider is configured.",
      notificationProviderConfigured: false,
      needsClientReview: true,
    },
    update: {
      registrationEnabled: true,
      dashboardEnabled: true,
      emailVerificationRequired: false,
      passwordRecoveryEnabled: false,
      publicRegistrationInstructions:
        "Customer accounts are enabled for production preview. Email delivery remains disabled until SMTP is configured.",
      publicRecoveryInstructions:
        "Password recovery is prepared without live email delivery. Do not claim that recovery email was sent until a provider is configured.",
      notificationProviderConfigured: false,
      needsClientReview: true,
    },
  });
}
