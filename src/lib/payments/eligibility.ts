import "server-only";

import type {
  CartItem,
  PaymentEligibilityMode,
  Prisma,
} from "@/generated/prisma/client";
import { providerCheckoutAllowed } from "@/lib/payments/core";
import { prisma } from "@/lib/db/prisma";

export class PaymentError extends Error {
  status = 400;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaymentError";
    this.status = status;
  }
}

type EligibilityClient = Pick<
  Prisma.TransactionClient,
  "paymentEligibilityRule" | "catalogueService"
>;

function defaultRule(sourceKey: string) {
  return {
    sourceKey,
    mode: "PROVIDER_REVIEW_REQUIRED" as PaymentEligibilityMode,
    needsClientReview: true,
  };
}

async function cartKindRule(client: EligibilityClient, kind: CartItem["kind"]) {
  const rule = await client.paymentEligibilityRule.findUnique({
    where: { stableKey: `cart-kind:${kind}` },
    select: {
      sourceKey: true,
      mode: true,
      needsClientReview: true,
    },
  });
  return rule ?? defaultRule(kind);
}

async function serviceRule(client: EligibilityClient, item: CartItem) {
  if (
    !["SKILLING_ESTIMATE", "BOSSING_ESTIMATE", "PREMIUM_ESTIMATE"].includes(
      item.kind,
    )
  ) {
    return null;
  }
  const serviceId = item.sourceReference.split(":")[0];
  if (!serviceId) return defaultRule(`${item.kind}:missing-service`);
  const service = await client.catalogueService.findUnique({
    where: { id: serviceId },
    select: { canonicalSlug: true },
  });
  if (!service) return defaultRule(`${item.kind}:unknown-service`);
  const rule = await client.paymentEligibilityRule.findUnique({
    where: { stableKey: `service:${service.canonicalSlug}` },
    select: {
      sourceKey: true,
      mode: true,
      needsClientReview: true,
    },
  });
  return rule ?? defaultRule(service.canonicalSlug);
}

export async function providerEligibilityForCartItems(
  items: CartItem[],
  client: EligibilityClient = prisma,
) {
  const rules = [];
  for (const item of items) {
    rules.push(await cartKindRule(client, item.kind));
    const service = await serviceRule(client, item);
    if (service) rules.push(service);
  }
  return providerCheckoutAllowed(rules);
}

export async function assertProviderEligibilityForCartItems(
  items: CartItem[],
  client: EligibilityClient = prisma,
) {
  const result = await providerEligibilityForCartItems(items, client);
  if (!result.allowed) {
    throw new PaymentError(result.reason, 403);
  }
  return result;
}
