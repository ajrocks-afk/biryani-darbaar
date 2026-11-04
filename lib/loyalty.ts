import { calcTotals } from "./pricing";

// ASSUMPTIONS (label these in the TDD)
export const EARN_RUPEES_PER_POINT = 20; // 1 point per Rs 20 spent (about 5% back)
export const POINT_VALUE_INR = 1;        // 1 point = Rs 1 off
export const MIN_REDEEM_POINTS = 50;
export const MAX_REDEEM_PERCENT = 20;    // of the subtotal

export function earnPoints(totalInr: number): number {
  return Math.floor(totalInr / EARN_RUPEES_PER_POINT);
}

/** How many points can be used on this order. 0 means "not allowed". */
export function redeemablePoints(balance: number, subtotal: number, hasCoupon: boolean): number {
  if (hasCoupon || balance <= 0 || subtotal <= 0) return 0;
  const cap = Math.floor((subtotal * MAX_REDEEM_PERCENT) / 100 / POINT_VALUE_INR);
  const usable = Math.min(balance, cap);
  return usable >= MIN_REDEEM_POINTS ? usable : 0;
}

/** Totals when points are used. GST is recalculated on the amount actually paid. */
export function calcTotalsWithPoints(subtotal: number, points: number) {
  const off = points * POINT_VALUE_INR;
  const net = calcTotals(subtotal - off, null);
  return { subtotal, discount: off, gstIncluded: net.gstIncluded, total: net.total };
}
