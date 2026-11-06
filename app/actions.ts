"use server";
import { supabaseAdmin as db } from "@/lib/supabaseAdmin";
import { calcTotals, type Coupon } from "@/lib/pricing";
import { estimatePrepMinutes, promisedMinutes } from "@/lib/prep";
import { pickPrize } from "@/lib/prizes";
import { redeemablePoints, calcTotalsWithPoints } from "@/lib/loyalty";
import { resolveOptions } from "@/lib/options";
import { inWindow, istMinutes } from "@/lib/menuTime";

const METHODS = ["upi", "card", "netbanking", "wallet", "cod"];

async function userFromToken(token?: string) {
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user ?? null;
}

async function pointsBalance(userId: string): Promise<number> {
  const { data } = await db.from("loyalty_ledger").select("points").eq("customer_id", userId);
  return (data ?? []).reduce((s: number, r: any) => s + r.points, 0);
}

type Found = { coupon: Coupon; userCouponId?: string };

async function findCoupon(code: string, userId?: string): Promise<Found | { error: string }> {
  const clean = code.trim().toUpperCase().slice(0, 30);
  if (!clean) return { error: "Enter a code" };

  const { data } = await db
    .from("coupons")
    .select("code, percent_off, max_discount_inr, min_order_inr")
    .eq("code", clean).eq("is_active", true).maybeSingle();
  if (data) return { coupon: data };

  if (userId) {
    const { data: uc } = await db
      .from("user_coupons")
      .select("id, code, percent_off, max_discount_inr, min_order_inr, expires_at, scratched, used")
      .eq("user_id", userId).eq("code", clean).maybeSingle();
    if (uc) {
      if (!uc.scratched) return { error: "Scratch your reward card first" };
      if (uc.used) return { error: "This coupon has already been used" };
      if (new Date(uc.expires_at) < new Date()) return { error: "This coupon has expired" };
      return {
        coupon: {
          code: uc.code, percent_off: uc.percent_off,
          max_discount_inr: uc.max_discount_inr, min_order_inr: uc.min_order_inr,
        },
        userCouponId: uc.id,
      };
    }
  }
  return { error: "Invalid or expired coupon" };
}

export async function checkCoupon(code: string, accessToken?: string): Promise<{ coupon?: Coupon; error?: string }> {
  const user = await userFromToken(accessToken);
  const r = await findCoupon(code, user?.id);
  return "error" in r ? { error: r.error } : { coupon: r.coupon };
}

type Input = {
  accessToken: string;
  outletId: string;
  lines: { itemId: string; qty: number; optionIds?: string[] }[];
  couponCode?: string;
  usePoints?: boolean;
  paymentMethod: string;
  paymentProvider?: string;
};

export async function placeOrder(input: Input): Promise<{ orderNo?: string; error?: string }> {
  // 1. Who is calling? Verify the token on the server.
  const user = await userFromToken(input.accessToken);
  if (!user) return { error: "Your session expired. Please sign in again." };
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "customer") return { error: "Only customer accounts can place orders" };

  // 2. Validate input
  if (!input.lines?.length || input.lines.length > 30) return { error: "Your cart is empty" };
  if (!METHODS.includes(input.paymentMethod)) return { error: "Choose a payment method" };
  for (const l of input.lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) return { error: "Invalid quantity" };
    if (
      l.optionIds !== undefined &&
      (!Array.isArray(l.optionIds) || l.optionIds.length > 8 || l.optionIds.some((o) => typeof o !== "string"))
    )
      return { error: "Invalid options" };
  }
  const ids = Array.from(new Set(input.lines.map((l) => l.itemId)));

  const { data: outlet } = await db
    .from("outlets").select("id, min_prep_minutes").eq("id", input.outletId).maybeSingle();
  if (!outlet) return { error: "Outlet not found" };

  // 3. Prices come from the database, never from the browser
  const { data: rows } = await db
    .from("outlet_items")
    .select("is_available, menu_items(id, name, base_prep_minutes, available_from, available_to, item_prices(price_inr), item_options(id, kind, name, extra_price_inr))")
    .eq("outlet_id", input.outletId)
    .in("item_id", ids);

  const byId = new Map<string, any>();
  for (const r of (rows ?? []) as any[]) byId.set(r.menu_items.id, r);

  const nowMin = istMinutes(new Date());

  let subtotal = 0;
  const orderLines: {
    item_id: string; name: string; qty: number; price: number; baseMinutes: number; optionsText: string;
  }[] = [];
  for (const l of input.lines) {
    const r = byId.get(l.itemId);
    if (!r) return { error: "An item is not sold at this outlet" };
    if (!r.is_available) return { error: `${r.menu_items.name} is out of stock` };
    // Time-based menus are enforced here too, so the browser cannot bypass them
    if (!inWindow(r.menu_items.available_from, r.menu_items.available_to, nowMin))
      return { error: `${r.menu_items.name} is not available at this time` };
    const base = r.menu_items.item_prices?.[0]?.price_inr;
    if (!base) return { error: "Price missing for an item" };
    // Option prices are re-read from the database, never taken from the browser
    const sel = resolveOptions(r.menu_items.item_options ?? [], l.optionIds ?? []);
    if (!sel.ok) return { error: `${r.menu_items.name}: ${sel.error}` };
    const price = base + sel.extra;
    subtotal += price * l.qty;
    orderLines.push({
      item_id: l.itemId, name: r.menu_items.name, qty: l.qty, price,
      baseMinutes: r.menu_items.base_prep_minutes, optionsText: sel.text,
    });
  }

  let coupon: Coupon | null = null;
  let userCouponId: string | undefined;
  if (input.couponCode) {
    const res = await findCoupon(input.couponCode, user.id);
    if ("error" in res) return { error: res.error };
    coupon = res.coupon;
    userCouponId = res.userCouponId;
  }

  // Loyalty points: the server decides the amount, never the browser
  let pointsUsed = 0;
  if (input.usePoints) {
    if (coupon) return { error: "Points can't be combined with a coupon" };
    const balance = await pointsBalance(user.id);
    pointsUsed = redeemablePoints(balance, subtotal, false);
    if (pointsUsed === 0) return { error: "You can't use points on this order" };
  }

  const t = pointsUsed > 0 ? calcTotalsWithPoints(subtotal, pointsUsed) : calcTotals(subtotal, coupon);

  // 4. Honest promised time: higher of estimate and outlet minimum
  const { data: active } = await db
    .from("orders").select("order_items(qty)")
    .eq("outlet_id", input.outletId).in("status", ["placed", "preparing"]);
  const queued = ((active ?? []) as any[]).reduce(
    (n, o) => n + (o.order_items ?? []).reduce((m: number, i: any) => m + i.qty, 0), 0);
  const estimate = estimatePrepMinutes(
    orderLines.map((l) => ({ baseMinutes: l.baseMinutes, qty: l.qty })), queued);
  const promised = promisedMinutes(estimate, outlet.min_prep_minutes);
  const promisedAt = new Date(Date.now() + promised * 60_000).toISOString();

  const orderNo = `WEB-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: order, error } = await db
    .from("orders")
    .insert({
      order_no: orderNo,
      customer_id: user.id,
      outlet_id: input.outletId,
      status: "placed",
      payment_method: input.paymentMethod,
      payment_provider: (input.paymentProvider ?? "").slice(0, 40) || null,
      // Mock gateway: cash on delivery stays pending, everything else is marked paid
      payment_status: input.paymentMethod === "cod" ? "pending" : "paid",
      subtotal_inr: t.subtotal,
      discount_inr: t.discount,
      total_inr: t.total,
      gst_included_inr: t.gstIncluded,
      coupon_code: coupon?.code ?? null,
      points_redeemed: pointsUsed,
      promised_at: promisedAt,
      ai_estimate_minutes: estimate,
    })
    .select("id")
    .single();
  if (error || !order) return { error: "Could not place order. Please try again." };

  const { error: itemsErr } = await db.from("order_items").insert(
    orderLines.map((l) => ({
      order_id: order.id,
      item_id: l.item_id,
      name_snapshot: l.name,
      qty: l.qty,
      unit_price_inr: l.price,
      options_text: l.optionsText || null,
    }))
  );
  if (itemsErr) {
    await db.from("orders").delete().eq("id", order.id);
    return { error: "Could not place order. Please try again." };
  }

  // Spend the points last. If this fails, undo the order so nothing is half done.
  if (pointsUsed > 0) {
    const { error: rErr } = await db.rpc("redeem_points", {
      p_user: user.id, p_order: order.id, p_points: pointsUsed,
    });
    if (rErr) {
      await db.from("orders").delete().eq("id", order.id);
      return { error: "Could not use your points. Please try again." };
    }
  }

  await db.from("order_events").insert({ order_id: order.id, status: "placed" });

  // 5. Mark a reward coupon as used (only if it actually gave a discount)
  if (userCouponId && t.discount > 0) {
    await db.from("user_coupons").update({ used: true }).eq("id", userCouponId).eq("used", false);
  }

  // 6. Grant a scratch card. The prize is picked here on the server. A failure must never fail the order.
  const prize = pickPrize(Math.random());
  await db.from("user_coupons").insert({
    user_id: user.id,
    code: `DB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    ...prize,
    expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    source_order_no: orderNo,
  });

  return { orderNo };
}