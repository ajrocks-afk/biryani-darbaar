"use client";
import { useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import FoodImage from "@/components/FoodImage";

export type MenuEntry = {
  id: string; name: string; description: string | null; photo_url: string | null;
  category: string; is_veg: boolean; spice_level: number; allergens: string[];
  price: number; available: boolean;
};

const BESTSELLERS = ["Chicken Dum Biryani", "Mutton Dum Biryani", "Mutton Haleem"]; // assumption

export default function MenuClient({ outletId, items }: { outletId: string; items: MenuEntry[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.category)))], [items]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = items.filter(
      (i) => (cat === "All" || i.category === cat) && (!term || i.name.toLowerCase().includes(term))
    );
    const map = new Map<string, MenuEntry[]>();
    for (const i of filtered) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return [...map.entries()];
  }, [items, q, cat]);

  return (
    <>
      <div className="glass sticky top-[45px] z-20 -mx-4 rounded-none border-x-0 px-4 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search biryani, kebabs, desserts..."
          className="w-full rounded-xl border border-sand bg-white/80 px-4 py-2.5 text-sm outline-none focus:border-emerald"
        />
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold ${
                cat === c ? "bg-emerald text-white" : "bg-white/70 text-ink/70"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 text-ink/60">No dishes match "{q}".</p>
        </div>
      )}

      {groups.map(([category, list]) => (
        <section key={category} className="mt-5">
          <h2 className="mb-2 font-display text-lg font-bold text-emerald">{category}</h2>
          <ul className="space-y-3">
            {list.map((m) => (
              <li key={m.id} className="glass flex gap-3 rounded-2xl p-2.5">
                <div className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ${m.available ? "" : "opacity-40 grayscale"}`}>
                  <FoodImage src={m.photo_url} alt={m.name} />
                  {BESTSELLERS.includes(m.name) && (
                    <span className="absolute left-1 top-1 rounded-full bg-terracotta px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Bestseller
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 ${m.is_veg ? "border-green-700" : "border-red-700"}`}
                        title={m.is_veg ? "Veg" : "Non-veg"}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${m.is_veg ? "bg-green-700" : "bg-red-700"}`} />
                      </span>
                      <h3 className="truncate text-sm font-semibold">{m.name}</h3>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">{m.description}</p>
                    <p className="mt-0.5 text-[10px] text-ink/50">
                      {"🌶".repeat(m.spice_level || 0)}
                      {m.allergens?.length > 0 && ` Contains: ${m.allergens.join(", ")}`}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-semibold">₹{m.price}</span>
                    {m.available ? (
                      <AddButton outletId={outletId} itemId={m.id} name={m.name} price={m.price} />
                    ) : (
                      <span className="text-xs font-medium text-ink/50">Out of stock</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}