type CurrencyAmount = {
  currencyCode: string;
  amountCents: number;
  count?: number;
};

export function summarizeSales(
  gross: CurrencyAmount[],
  refunds: CurrencyAmount[],
) {
  const totals = new Map<
    string,
    {
      currencyCode: string;
      grossCents: number;
      refundCents: number;
      netCents: number;
      paidOrders: number;
    }
  >();
  for (const row of gross) {
    totals.set(row.currencyCode, {
      currencyCode: row.currencyCode,
      grossCents: row.amountCents,
      refundCents: 0,
      netCents: row.amountCents,
      paidOrders: row.count ?? 0,
    });
  }
  for (const row of refunds) {
    const total = totals.get(row.currencyCode) ?? {
      currencyCode: row.currencyCode,
      grossCents: 0,
      refundCents: 0,
      netCents: 0,
      paidOrders: 0,
    };
    total.refundCents += row.amountCents;
    total.netCents = total.grossCents - total.refundCents;
    totals.set(row.currencyCode, total);
  }
  return [...totals.values()].sort((a, b) =>
    a.currencyCode.localeCompare(b.currencyCode),
  );
}
