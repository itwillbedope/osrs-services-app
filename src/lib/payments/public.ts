import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function getPublicPaymentTransaction(transactionId: string) {
  if (!/^[a-z0-9]{1,30}$/i.test(transactionId)) return null;
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      provider: true,
      status: true,
      amountMinor: true,
      currencyCode: true,
      providerCheckoutId: true,
      createdAt: true,
      paidAt: true,
      order: {
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
        },
      },
    },
  });
  if (!payment) return null;
  return {
    ...payment,
    createdAt: payment.createdAt.toISOString(),
    paidAt: payment.paidAt?.toISOString() ?? null,
  };
}
