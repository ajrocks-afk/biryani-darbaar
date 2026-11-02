"use client";
import { useCart } from "@/lib/cart";

export default function AddButton({
  outletId, itemId, name, price, disabled,
}: { outletId: string; itemId: string; name: string; price: number; disabled?: boolean }) {
  const { lines, outletId: cartOutlet, add, remove } = useCart();
  const qty = cartOutlet === outletId ? lines.find((l) => l.itemId === itemId)?.qty ?? 0 : 0;

  if (disabled) return null;
  if (qty === 0)
    return (
      <button
        onClick={() => add(outletId, { itemId, name, price })}
        className="rounded-lg border border-maroon bg-white px-5 py-1.5 text-sm font-semibold text-maroon transition hover:bg-maroon hover:text-white"
      >
        ADD
      </button>
    );
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-maroon px-1 py-1 text-white">
      <button onClick={() => remove(itemId)} className="h-7 w-7 text-lg leading-none" aria-label="Remove one">−</button>
      <span className="w-5 text-center text-sm font-semibold">{qty}</span>
      <button onClick={() => add(outletId, { itemId, name, price })} className="h-7 w-7 text-lg leading-none" aria-label="Add one">+</button>
    </div>
  );
}