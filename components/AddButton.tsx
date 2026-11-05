"use client";
import { useCart } from "@/lib/cart";

export default function AddButton({
  outletId, itemId, name, price, disabled,
}: { outletId: string; itemId: string; name: string; price: number; disabled?: boolean }) {
  const { lines, outletId: cartOutlet, add, remove } = useCart();
  const qty = cartOutlet === outletId ? lines.find((l) => l.key === itemId)?.qty ?? 0 : 0;
  const line = { key: itemId, itemId, name, price, optionIds: [], optionsText: "" };

  if (disabled) return null;
  if (qty === 0)
    return (
      <button
        onClick={() => add(outletId, line)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald text-xl text-white shadow-md transition active:scale-90"
        aria-label={`Add ${name}`}
      >
        +
      </button>
    );
  return (
    <div className="inline-flex items-center rounded-full bg-emerald px-1 text-white shadow-md">
      <button onClick={() => remove(itemId)} className="h-9 w-8 text-lg" aria-label="Remove one">−</button>
      <span className="w-5 text-center text-sm font-semibold">{qty}</span>
      <button onClick={() => add(outletId, line)} className="h-9 w-8 text-lg" aria-label="Add one">+</button>
    </div>
  );
}