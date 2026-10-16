import { z } from "zod";

const bps = z.number().int().min(0).max(10000);
export const capePricingSchema = z.object({
  ranged: z.number().int().min(1).max(99),
  magic: z.number().int().min(1).max(99),
  defence: z.number().int().min(1).max(99),
  prayer: z.number().int().min(1).max(99),
  hitpoints: z.number().int().min(1).max(99),
  lowStatsBps: bps,
  pureBps: bps,
  oneDefenceBps: bps,
  zerkerBps: bps,
  noRigourBps: bps,
  noBlowpipeBps: bps,
  slayerDiscountBps: bps,
});
