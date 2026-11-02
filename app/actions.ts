"use server";
import { supabase } from "@/lib/supabase";
import { calcTotals, type Coupon } from "@/lib/pricing";

export async function checkCoupon(code: string): Promise<{ coupon?: Coupon; error?: string }> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { error: "Enter a code" };
  const { data } = await supabase
    .from("coupons")
    .select("code, percent_off, max_discount_inr, min_order_inr")
    .eq("code", clean)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return { error: "Invalid or expired coupon" };
  return { coupon: data };
}

type Input = {
  outletId: string;
  lines: { itemId: string; qty: number }[];
  couponCode?: string;
  paymentMethod: "upi" | "card";
};

export async function placeOrder(input: Input): Promise<{ orderNo?: string; error?: string }> {
  if (!input.lines?.length) return { error: "Your cart is empty" };
  if (!["upi", "card"].includes(input.paymentMethod)) return { error: "Choose a payment method" };
  for (const l of input.lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) return { error: "Invalid quantity" };
  }

  const ids = input.lines.map((l) => l.itemId);

  const { data: outlet } = await supabase
    .from("outlets").select("id, min_prep_minutes").eq("id", input.outletId).maybeSingle();
  if (!outlet) return { error: "Outlet not found" };

  const { data: rows } = await supabase
    .from("outlet_items")
    .select("is_available, menu_items(id, name, base_prep_minutes, item_prices(price_inr))")
    .eq("outlet_id", input.outletId)
    .in("item_id", ids);

  const byId = new Map<string, any>();
  for (const r of (rows ?? []) as any[]) byId.set(r.menu_items.id, r);

  let subtotal = 0;
  const orderLines: { item_id: string; name: string; qty: number; price: number }[] = [];
  for (const l of input.lines) {
    const r = byId.get(l.itemId);
    if (!r) return { error: "An item is not sold at this outlet" };
    if (!r.is_available) return { error: `${r.menu_items.name} is out of stock` };
    const price = r.menu_items.item_prices?.[0]?.price_inr;
    if (!price) return { error: "Price missing for an item" };
    subtotal += price * l.qty;
    orderLines.push({ item_id: l.itemId, name: r.menu_items.name, qty: l.qty, price });
  }

  let coupon: Coupon | null = null;
  if (input.couponCode) {
    const res = await checkCoupon(input.couponCode);
    if (res.error) return { error: res.error };
    coupon = res.coupon!;
  }
  const t = calcTotals(subtotal, coupon);

  // Promised time (simple version for now: outlet minimum; AI estimate comes later)
  const promisedAt = new Date(Date.now() + outlet.min_prep_minutes * 60_000).toISOString();
  const orderNo = `WEB-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo,
      outlet_id: input.outletId,
      status: "placed",
      payment_method: input.paymentMethod,
      payment_status: "paid", // mock payment
      subtotal_inr: t.subtotal,
      discount_inr: t.discount,
      total_inr: t.total,
      gst_included_inr: t.gstIncluded,
      coupon_code: coupon?.code ?? null,
      promised_at: promisedAt,
    })
    .select("id")
    .single();
  if (error || !order) return { error: "Could not place order. Please try again." };

  await supabase.from("order_items").insert(
    orderLines.map((l) => ({
      order_id: order.id, item_id: l.item_id, name_snapshot: l.name, qty: l.qty, unit_price_inr: l.price,
    }))
  );
  await supabase.from("order_events").insert({ order_id: order.id, status: "placed" });

  return { orderNo };
}