export type Coupon = {
    code: string;
    percent_off: number | null;
    max_discount_inr: number | null;
    min_order_inr: number | null;
  };
  
  export function calcTotals(subtotal: number, coupon?: Coupon | null) {
    let discount = 0;
    if (coupon && subtotal >= (coupon.min_order_inr ?? 0)) {
      const raw = Math.floor((subtotal * (coupon.percent_off ?? 0)) / 100);
      discount = Math.min(raw, coupon.max_discount_inr ?? raw);
    }
    const total = subtotal - discount;
    const gstIncluded = Math.round((total * 5) / 105); // prices already include 5% GST
    return { subtotal, discount, total, gstIncluded };
  }