"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { calcTotals, type Coupon } from "@/lib/pricing";
import { redeemablePoints, calcTotalsWithPoints, MIN_REDEEM_POINTS } from "@/lib/loyalty";
import { checkCoupon, placeOrder } from "@/app/actions";
import { myCoupons } from "@/app/rewards";
import type { Reward } from "@/lib/prizes";
import type { PayMethod } from "@/lib/payment";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import PaymentSheet from "@/components/PaymentSheet";

export default function CartPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { outletId, lines, add, remove, clear, subtotal } = useCart();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [wallet, setWallet] = useState<Reward[]>([]);
  const [balance, setBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState("");

  const redeemable = redeemablePoints(balance, subtotal, coupon !== null);
  const pointsOff = usePoints ? redeemable : 0;
  const t = pointsOff > 0 ? calcTotalsWithPoints(subtotal, pointsOff) : calcTotals(subtotal, coupon);

  useEffect(() => {
    if (profile?.role !== "customer") return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setWallet(await myCoupons(session.access_token));
      const { data } = await supabase.from("loyalty_ledger").select("points");
      setBalance((data ?? []).reduce((s: number, r: any) => s + r.points, 0));
    })();
  }, [profile]);

  if (placed)
    return <main className="px-5 py-20 text-center text-ink/60">Order placed. Taking you to tracking…</main>;

  if (lines.length === 0)
    return (
      <main className="px-5 py-16 text-center">
        <p className="text-5xl">🍛</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-1 text-ink/60">Pick an outlet and add something delicious.</p>
        <Link href="/#outlets" className="mt-6 inline-block rounded-xl bg-emerald px-6 py-3 font-semibold text-white">
          Browse outlets
        </Link>
      </main>
    );

  async function applyCoupon(c: string = code) {
    setCouponMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await checkCoupon(c, session?.access_token);
    if (res.error) { setCoupon(null); setCouponMsg(res.error); return; }
    if (subtotal < (res.coupon!.min_order_inr ?? 0)) {
      setCoupon(null);
      setCouponMsg(`Add items worth ₹${res.coupon!.min_order_inr} or more to use this code`);
      return;
    }
    setCode(c.toUpperCase());
    setCoupon(res.coupon!);
    setCouponMsg("Coupon applied");
  }

  function openPay() {
    setError("");
    if (!profile) { router.push("/login"); return; }
    if (profile.role !== "customer") {
      setError("Staff accounts can't place orders. Sign in as a customer.");
      return;
    }
    setSheet(true);
  }

  async function completeOrder(method: PayMethod, provider: string): Promise<{ error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await placeOrder({
      accessToken: session?.access_token ?? "",
      outletId: outletId!,
      lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      couponCode: coupon?.code,
      usePoints: pointsOff > 0,
      paymentMethod: method,
      paymentProvider: provider,
    });
    if (res.error) return { error: res.error };
    setPlaced(true);
    clear();
    router.push(`/order/${res.orderNo}?new=1`);
    return {};
  }

  let pointsHint = "";
  if (coupon) pointsHint = "Points can't be combined with a coupon";
  else if (redeemable > 0) pointsHint = `You have ${balance}. Use ${redeemable} points to save ₹${redeemable}`;
  else if (balance < MIN_REDEEM_POINTS) pointsHint = `You have ${balance}. You need ${MIN_REDEEM_POINTS} to redeem`;
  else pointsHint = `You have ${balance}. Add more items: points can cover up to 20% of the order`;

  return (
    <main className="px-4 pb-32 pt-4">
      <Link href={`/menu/${outletId}`} className="text-sm text-ink/60">← Back to menu</Link>
      <h1 className="mt-2 font-display text-2xl font-bold">Your order</h1>

      <ul className="glass mt-4 divide-y divide-sand rounded-2xl px-4">
        {lines.map((l) => (
          <li key={l.itemId} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold">{l.name}</p>
              <p className="text-xs text-ink/60">₹{l.price} each</p>
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald px-1 text-white">
              <button onClick={() => remove(l.itemId)} className="h-8 w-8 text-lg" aria-label="Remove one">−</button>
              <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
              <button onClick={() => add(outletId!, { itemId: l.itemId, name: l.name, price: l.price })} className="h-8 w-8 text-lg" aria-label="Add one">+</button>
            </div>
          </li>
        ))}
      </ul>

      {wallet.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">🎁 Your reward coupons</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {wallet.map((r) => (
              <button key={r.id} onClick={() => applyCoupon(r.code)}
                className="shrink-0 rounded-xl border border-dashed border-saffron bg-white/70 px-3 py-2 text-left">
                <span className="block text-sm font-bold text-emerald">{r.percent_off}% OFF</span>
                <span className="block text-[10px] text-ink/60">min ₹{r.min_order_inr} · {r.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          className="flex-1 rounded-xl border border-sand bg-white px-4 py-3 text-sm uppercase outline-none focus:border-emerald"
        />
        <button onClick={() => applyCoupon()} className="rounded-xl border border-emerald px-5 text-sm font-semibold text-emerald">
          Apply
        </button>
      </div>
      {couponMsg && (
        <p className={`mt-2 text-sm ${coupon ? "text-green-700" : "text-red-700"}`}>{couponMsg}</p>
      )}

      {balance > 0 && (
        <label className={`glass mt-5 flex items-center justify-between gap-3 rounded-2xl p-4 ${redeemable === 0 ? "opacity-60" : ""}`}>
          <span>
            <span className="block text-sm font-semibold">Use Darbaar points</span>
            <span className="block text-xs text-ink/60">{pointsHint}</span>
          </span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-emerald"
            checked={pointsOff > 0}
            disabled={redeemable === 0}
            onChange={(e) => setUsePoints(e.target.checked)}
          />
        </label>
      )}

      <dl className="glass mt-5 space-y-2 rounded-2xl p-4 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>₹{t.subtotal}</dd></div>
        {t.discount > 0 && (
          <div className="flex justify-between text-green-700">
            <dt>{pointsOff > 0 ? "Points redeemed" : "Discount"}</dt><dd>−₹{t.discount}</dd>
          </div>
        )}
        <div className="flex justify-between text-ink/60"><dt>Includes 5% GST</dt><dd>₹{t.gstIncluded}</dd></div>
        <div className="flex justify-between border-t border-sand pt-3 text-base font-bold">
          <dt>Total</dt><dd>₹{t.total}</dd>
        </div>
      </dl>

      {!profile && <p className="mt-4 text-sm text-ink/60">You'll be asked to sign in before paying.</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <button
        onClick={openPay}
        className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md rounded-2xl bg-emerald py-4 text-base font-semibold text-white shadow-xl"
      >
        Choose payment · ₹{t.total}
      </button>

      {sheet && <PaymentSheet total={t.total} onClose={() => setSheet(false)} onPaid={completeOrder} />}
    </main>
  );
}