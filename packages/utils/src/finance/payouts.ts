export const PAYOUT_DEDUCTION_PORTION = 0.05;
export const PAYOUT_NET_PORTION = 1 - PAYOUT_DEDUCTION_PORTION;

export function calculateNetPayoutAmount(grossRevenue: number): number {
  if (!Number.isFinite(grossRevenue)) return 0;
  return Math.max(0, Math.floor(grossRevenue * PAYOUT_NET_PORTION));
}
