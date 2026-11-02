import { describe, it, expect } from "vitest";
import { calcTotals } from "./pricing";

const coupon = {
  code: "DARBAAR10",
  percent_off: 10,
  max_discount_inr: 150,
  min_order_inr: 300,
};

describe("calcTotals", () => {
  it("no coupon", () => {
    expect(calcTotals(1000)).toEqual({
      subtotal: 1000,
      discount: 0,
      total: 1000,
      gstIncluded: 48,
    });
  });
  it("applies percent discount", () => {
    expect(calcTotals(1000, coupon).discount).toBe(100);
  });
  it("caps the discount", () => {
    expect(calcTotals(2000, coupon).discount).toBe(150);
  });
  it("ignores coupon below minimum order", () => {
    expect(calcTotals(200, coupon).discount).toBe(0);
  });
  it("GST is extracted from the inclusive total", () => {
    expect(calcTotals(900).gstIncluded).toBe(43);
  });
});