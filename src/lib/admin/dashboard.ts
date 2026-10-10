import "server-only";

import { requireCapability } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { summarizeSales } from "./sales-summary";

export async function getBusinessDashboard() {
  await requireCapability("dashboard.view", "/admin");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [
    orderCount,
    monthOrderCount,
    openOrderCount,
    activeCustomers,
    statuses,
    gross,
    refunds,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.order.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
    }),
    prisma.user.count({ where: { accountType: "CUSTOMER", status: "ACTIVE" } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.groupBy({
      by: ["currencyCode"],
      where: { paidAt: { not: null } },
      _sum: { finalTotalCents: true },
      _count: { _all: true },
    }),
    prisma.paymentRefund.groupBy({
      by: ["currencyCode"],
      where: { status: "SUCCEEDED" },
      _sum: { amountMinor: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        currencyCode: true,
        finalTotalCents: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    orderCount,
    monthOrderCount,
    openOrderCount,
    activeCustomers,
    statuses,
    recentOrders,
    sales: summarizeSales(
      gross.map((row) => ({
        currencyCode: row.currencyCode,
        amountCents: row._sum.finalTotalCents ?? 0,
        count: row._count._all,
      })),
      refunds.map((row) => ({
        currencyCode: row.currencyCode,
        amountCents: row._sum.amountMinor ?? 0,
      })),
    ),
  };
}
