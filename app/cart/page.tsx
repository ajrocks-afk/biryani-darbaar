"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { calcTotals, type Coupon } from "@/lib/pricing";
import { checkCoupon, placeOrder } from "@/app/actions";
import { useProfile } from "@/lib/useProfile";
import { supabase } from "@/lib/supabase";


export default function CartPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { outletId, lines, add, remove, clear, subtotal } = useCart();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const t = calcTotals(subtotal, coupon);

  if (lines.length === 0)
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-5xl">🍛</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-1 text-ink/60">Pick an outlet and add something delicious.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-emerald px-6 py-3 font-semibold text-white">
          Browse outlets
        </Link>
      </main>
    );

  async function applyCoupon() {
    setCouponMsg("");
    const res = await checkCoupon(code);
    if (res.error) { setCoupon(null); setCouponMsg(res.error); return; }
    if (subtotal < (res.coupon!.min_order_inr ?? 0)) {
      setCoupon(null);
      setCouponMsg(`Add items worth ₹${res.coupon!.min_order_inr} or more to use this code`);
      return;
    }
    setCoupon(res.coupon!);
    setCouponMsg("Coupon applied");
  }

  async function pay() {
    if (!profile) { router.push("/login"); return; }
    if (profile.role !== "customer") {
      setError("Staff accounts can't place orders. Sign in as a customer.");
      return;
    }
    setBusy(true);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await placeOrder({
      accessToken: session?.access_token ?? "",
      outletId: outletId!,
      lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
      couponCode: coupon?.code,
      paymentMethod: method,
    });
    if (res.error) { setError(res.error); setBusy(false); return; }
    clear();
    router.push(`/order/${res.orderNo}`);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6 pb-32">
      <Link href={`/menu/${outletId}`} className="text-sm text-ink/60">← Back to menu</Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Your order</h1>

      <ul className="mt-4 divide-y divide-sand rounded-2xl border border-sand bg-white px-4">
        {lines.map((l) => (
          <li key={l.itemId} className="flex items-center justify-between py-4">
            <div>
              <p className="font-semibold">{l.name}</p>
              <p className="text-sm text-ink/60">₹{l.price} each</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg bg-emerald px-1 py-1 text-white">
              <button onClick={() => remove(l.itemId)} className="h-7 w-7 text-lg leading-none" aria-label="Remove one">−</button>
              <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
              <button onClick={() => add(outletId!, { itemId: l.itemId, name: l.name, price: l.price })} className="h-7 w-7 text-lg leading-none" aria-label="Add one">+</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          className="flex-1 rounded-xl border border-sand bg-white px-4 py-3 uppercase outline-none focus:border-emerald"
        />
        <button onClick={applyCoupon} className="rounded-xl border border-emerald px-5 font-semibold text-emerald">
          Apply
        </button>
      </div>
      {couponMsg && (
        <p className={`mt-2 text-sm ${coupon ? "text-green-700" : "text-red-700"}`}>{couponMsg}</p>
      )}

      <dl className="mt-6 space-y-2 rounded-2xl border border-sand bg-white p-4 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>₹{t.subtotal}</dd></div>
        {t.discount > 0 && (
          <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−₹{t.discount}</dd></div>
        )}
        <div className="flex justify-between text-ink/60"><dt>Includes 5% GST</dt><dd>₹{t.gstIncluded}</dd></div>
        <div className="flex justify-between border-t border-sand pt-3 text-lg font-bold">
          <dt>Total</dt><dd>₹{t.total}</dd>
        </div>
      </dl>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold">Pay with (test mode, no real money)</legend>
        <div className="flex gap-3">
          {(["upi", "card"] as const).map((m) => (
            <label
              key={m}
              className={`flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-center font-medium ${
                method === m ? "border-emerald bg-emerald/5 text-emerald" : "border-sand bg-white"
              }`}
            >
              <input type="radio" name="method" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
              {m === "upi" ? "UPI" : "Card"}
            </label>
          ))}
        </div>
      </fieldset>

      {!profile && (
        <p className="mt-4 text-sm text-ink/60">You'll be asked to sign in before paying.</p>
      )}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <button
        onClick={pay}
        disabled={busy}
        className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md rounded-2xl bg-emerald py-4 text-lg font-semibold text-white shadow-xl disabled:opacity-50"
      >
        {busy ? "Placing order..." : `Pay ₹${t.total} (test)`}
      </button>
    </main>
  );
}