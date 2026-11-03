import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AddButton from "@/components/AddButton";
import CartBar from "@/components/CartBar";
import FoodImage from "@/components/FoodImage";
import StaffRedirect from "@/components/StaffRedirect";

const ORDER = ["Biryani", "Specials", "Starters", "Sides", "Desserts"];

async function Menu({ outletId }: { outletId: string }) {
  const { data: outlet } = await supabase
    .from("outlets").select("name, fssai_no").eq("id", outletId).maybeSingle();

  const { data: rows, error } = await supabase
    .from("outlet_items")
    .select("is_available, menu_items(id, name, description, photo_url, category, is_veg, spice_level, allergens, item_prices(price_inr))")
    .eq("outlet_id", outletId);

  if (error) return <p className="text-red-700">Could not load the menu. Please refresh.</p>;
  if (!outlet || !rows?.length) return <p className="text-ink/60">This menu is not available right now.</p>;

  const groups = new Map<string, any[]>();
  for (const r of rows as any[]) {
    const cat = r.menu_items.category;
    groups.set(cat, [...(groups.get(cat) ?? []), r]);
  }
  const cats = [...groups.keys()].sort(
    (a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99
  );

  return (
    <>
      <h1 className="font-display text-3xl font-bold">{outlet.name}</h1>
      <p className="mt-1 text-sm text-ink/60">
        FSSAI {outlet.fssai_no} · All prices include 5% GST
      </p>

      {cats.map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-emerald">{cat}</h2>
          <ul className="space-y-4">
            {groups.get(cat)!.map((r: any) => {
              const m = r.menu_items;
              const price = m.item_prices?.[0]?.price_inr;
              const out = !r.is_available;
              return (
                <li key={m.id} className="flex gap-4 rounded-2xl border border-sand bg-white p-3">
                  <div className={`h-28 w-28 shrink-0 overflow-hidden rounded-xl ${out ? "opacity-40 grayscale" : ""}`}>
                    <FoodImage src={m.photo_url} alt={m.name} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 ${m.is_veg ? "border-green-700" : "border-red-700"}`}
                          title={m.is_veg ? "Veg" : "Non-veg"}
                        >
                          <span className={`h-2 w-2 rounded-full ${m.is_veg ? "bg-green-700" : "bg-red-700"}`} />
                        </span>
                        <h3 className="truncate font-semibold">{m.name}</h3>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-ink/60">{m.description}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {"🌶".repeat(m.spice_level || 0)}
                        {m.allergens?.length > 0 && ` Contains: ${m.allergens.join(", ")}`}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-semibold">₹{price}</span>
                      {out ? (
                        <span className="text-xs font-medium text-ink/50">Out of stock</span>
                      ) : (
                        <AddButton outletId={outletId} itemId={m.id} name={m.name} price={price} />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function MenuSkeleton() {
  return (
    <div className="mt-8 space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-sand" />)}
    </div>
  );
}

async function MenuLoader({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = await params;
  return <Menu outletId={outletId} />;
}

export default function MenuPage({ params }: { params: Promise<{ outletId: string }> }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-28">
      <StaffRedirect />
      <Link href="/" className="text-sm text-ink/60">← Change outlet</Link>
      <div className="mt-3">
        <Suspense fallback={<MenuSkeleton />}>
          <MenuLoader params={params} />
        </Suspense>
      </div>
      <CartBar />
    </main>
  );
}