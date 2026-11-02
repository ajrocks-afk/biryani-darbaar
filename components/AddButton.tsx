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
        className="mt-2 rounded-lg border border-neutral-900 px-4 py-1.5 text-sm font-medium"
      >
        Add
      </button>
    );
  return (
    <div className="mt-2 inline-flex items-center gap-3 rounded-lg bg-neutral-900 px-2 py-1 text-white">
      <button onClick={() => remove(itemId)} className="px-2 text-lg" aria-label="Remove one">−</button>
      <span className="text-sm">{qty}</span>
      <button onClick={() => add(outletId, { itemId, name, price })} className="px-2 text-lg" aria-label="Add one">+</button>
    </div>
  );
}