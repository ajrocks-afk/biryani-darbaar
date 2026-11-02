"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { calcTotals, type Coupon } from "@/lib/pricing";
import { checkCoupon, placeOrder } from "@/app/actions";
import { useProfile } from "@/lib/useProfile";


export default function CartPage() {
  const router = useRouter();
  const { outletId, lines, add, remove, clear, subtotal } = useCart();
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { profile } = useProfile();

  const t = calcTotals(subtotal, coupon);

  if (lines.length === 0)
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/" className="mt-3 inline-block underline">Browse outlets</Link>
      </main>
    );

  async function applyCoupon() {
    setCouponMsg("");
    const res = await checkCoupon(code);
    if (res.error) { setCoupon(null); setCouponMsg(res.error); return; }
    if (subtotal < (res.coupon!.min_order_inr ?? 0)) {
      setCoupon(null);
      setCouponMsg(`Minimum order ₹${res.coupon!.min_order_inr}`);
      return;
    }
    setCoupon(res.coupon!);
    setCouponMsg("Coupon applied");
  }

  async function pay() {
    if (!profile) { router.push("/login"); return; }
    if (profile.role !== "customer") { setError("Staff accounts can't place orders. Sign in as a customer."); return; }
    setBusy(true);
    setError("");
    const res = await placeOrder({
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
    <main className="mx-auto max-w-md p-6 pb-28">
      <Link href={`/menu/${outletId}`} className="text-sm text-neutral-500">← Back to menu</Link>
      <h1 className="mt-2 text-2xl font-semibold">Your order</h1>

      <ul className="mt-4 divide-y divide-neutral-200">
        {lines.map((l) => (
          <li key={l.itemId} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{l.name}</p>
              <p className="text-sm text-neutral-500">₹{l.price} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => remove(l.itemId)} className="h-8 w-8 rounded-full border">−</button>
              <span>{l.qty}</span>
              <button onClick={() => add(outletId!, { itemId: l.itemId, name: l.name, price: l.price })} className="h-8 w-8 rounded-full border">+</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 uppercase"
        />
        <button onClick={applyCoupon} className="rounded-lg border border-neutral-900 px-4">Apply</button>
      </div>
      {couponMsg && <p className="mt-1 text-sm text-neutral-500">{couponMsg}</p>}

      <dl className="mt-6 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>₹{t.subtotal}</dd></div>
        {t.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−₹{t.discount}</dd></div>}
        <div className="flex justify-between text-neutral-500"><dt>Includes 5% GST</dt><dd>₹{t.gstIncluded}</dd></div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>₹{t.total}</dd></div>
      </dl>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-medium">Pay with (test mode)</legend>
        <div className="flex gap-3">
          {(["upi", "card"] as const).map((m) => (
            <label key={m} className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-center ${method === m ? "border-neutral-900 bg-neutral-50" : "border-neutral-300"}`}>
              <input type="radio" name="method" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
              {m === "upi" ? "UPI" : "Card"}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={pay}
        disabled={busy}
        className="fixed inset-x-4 bottom-4 mx-auto max-w-md rounded-xl bg-neutral-900 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Placing order..." : `Pay ₹${t.total} (test)`}
      </button>
    </main>
  );
}