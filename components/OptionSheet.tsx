"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { resolveOptions } from "@/lib/options";
import type { MenuEntry } from "@/components/MenuClient";

export default function OptionSheet({
  outletId, item, onClose,
}: { outletId: string; item: MenuEntry; onClose: () => void }) {
  const { add } = useCart();
  const options = item.options ?? [];
  const portions = options.filter((o) => o.kind === "portion");
  const addons = options.filter((o) => o.kind === "addon");

  const [portion, setPortion] = useState<string | null>(portions[0]?.id ?? null);
  const [picked, setPicked] = useState<string[]>([]);

  const selected = [...(portion ? [portion] : []), ...picked];
  const r = resolveOptions(options, selected);
  const extra = r.ok ? r.extra : 0;
  const unit = item.price + extra;

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function addToCart() {
    if (!r.ok) return;
    add(outletId, {
      key: r.ids.length ? `${item.id}|${[...r.ids].sort().join(",")}` : item.id,
      itemId: item.id,
      name: item.name,
      price: unit,
      optionIds: r.ids,
      optionsText: r.text,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-5 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/20" />
        <h2 className="font-display text-xl font-bold">{item.name}</h2>
        <p className="mt-1 text-xs text-ink/60">Base price ₹{item.price}, incl. 5% GST</p>

        {portions.length > 0 && (
          <section className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">Choose a portion</h3>
            <div className="mt-2 space-y-2">
              {portions.map((p) => (
                <label key={p.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border-2 bg-white px-4 py-3 text-sm ${portion === p.id ? "border-emerald" : "border-sand"}`}>
                  <span className="flex items-center gap-2">
                    <input type="radio" name="portion" checked={portion === p.id} onChange={() => setPortion(p.id)} />
                    {p.name}
                  </span>
                  <span className="text-ink/60">{p.extra_price_inr ? `+₹${p.extra_price_inr}` : "Included"}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {addons.length > 0 && (
          <section className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">Add-ons (optional)</h3>
            <div className="mt-2 space-y-2">
              {addons.map((a) => (
                <label key={a.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border-2 bg-white px-4 py-3 text-sm ${picked.includes(a.id) ? "border-emerald" : "border-sand"}`}>
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} />
                    {a.name}
                  </span>
                  <span className="text-ink/60">+₹{a.extra_price_inr}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        <button onClick={addToCart} disabled={!r.ok}
          className="mt-5 w-full rounded-2xl bg-emerald py-4 text-base font-semibold text-white disabled:opacity-50">
          Add to cart · ₹{unit}
        </button>
      </div>
    </div>
  );
}