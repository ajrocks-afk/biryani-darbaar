import { describe, it, expect } from "vitest";
import { earnPoints, redeemablePoints, calcTotalsWithPoints } from "./loyalty";

describe("earnPoints", () => {
  it("gives 1 point per Rs 20, rounded down", () => {
    expect(earnPoints(1180)).toBe(59);
    expect(earnPoints(19)).toBe(0);
  });
});

describe("redeemablePoints", () => {
  it("caps at 20% of the subtotal", () => {
    expect(redeemablePoints(500, 1000, false)).toBe(200);
  });
  it("uses the whole balance when it is under the cap", () => {
    expect(redeemablePoints(120, 1000, false)).toBe(120);
  });
  it("needs at least 50 points", () => {
    expect(redeemablePoints(49, 10000, false)).toBe(0);
  });
  it("returns 0 when the cap is under the minimum (small order)", () => {
    expect(redeemablePoints(500, 200, false)).toBe(0);
  });
  it("is not allowed together with a coupon", () => {
    expect(redeemablePoints(500, 1000, true)).toBe(0);
  });
  it("never exceeds the balance", () => {
    expect(redeemablePoints(60, 5000, false)).toBe(60);
  });
  it("handles empty or invalid input", () => {
    expect(redeemablePoints(0, 1000, false)).toBe(0);
    expect(redeemablePoints(100, 0, false)).toBe(0);
  });
});

describe("calcTotalsWithPoints", () => {
  it("takes the points off the total", () => {
    const t = calcTotalsWithPoints(1000, 100);
    expect(t.discount).toBe(100);
    expect(t.total).toBe(900);
  });
});

import { tierFor, earnPointsWithTier } from "./loyalty";

describe("tiers", () => {
  it("starts at Bronze and moves up at 3 and 6 orders", () => {
    expect(tierFor(0).name).toBe("Bronze");
    expect(tierFor(2).name).toBe("Bronze");
    expect(tierFor(3).name).toBe("Silver");
    expect(tierFor(6).name).toBe("Gold");
  });
  it("says how many orders to the next tier", () => {
    expect(tierFor(1).toNext).toBe(2);
    expect(tierFor(4).toNext).toBe(2);
    expect(tierFor(9).toNext).toBe(0);
  });
  it("multiplies points by tier, rounded down", () => {
    expect(earnPointsWithTier(1000, 0)).toBe(50);
    expect(earnPointsWithTier(1000, 3)).toBe(62);
    expect(earnPointsWithTier(1000, 6)).toBe(75);
  });
});