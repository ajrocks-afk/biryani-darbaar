import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AddButton from "@/components/AddButton";
import CartBar from "@/components/CartBar";
import StaffRedirect from "@/components/StaffRedirect";

async function Menu({ outletId }: { outletId: string }) {
  const { data: outlet } = await supabase
    .from("outlets")
    .select("name, fssai_no")
    .eq("id", outletId)
    .single();

  const { data: rows, error } = await supabase
    .from("outlet_items")
    .select("is_available, menu_items(id, name, description, category, is_veg, spice_level, allergens, item_prices(price_inr))")
    .eq("outlet_id", outletId);

  if (error) return <p className="text-red-600">Could not load menu: {error.message}</p>;
  if (!outlet || !rows?.length) return <p className="text-neutral-500">Menu not available.</p>;

  return (
    <>
      <h1 className="text-2xl font-semibold">{outlet.name}</h1>
      <p className="text-sm text-neutral-500">FSSAI {outlet.fssai_no} · All prices include 5% GST</p>
      <ul className="mt-6 divide-y divide-neutral-200">
        {rows.map((r: any) => {
          const m = r.menu_items;
          const price = m.item_prices?.[0]?.price_inr;
          return (
            <li key={m.id} className={`py-4 ${r.is_available ? "" : "opacity-40"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-sm border ${
                        m.is_veg ? "border-green-600 bg-green-600" : "border-red-700 bg-red-700"
                      }`}
                      title={m.is_veg ? "Veg" : "Non-veg"}
                    />
                    <span className="font-medium">{m.name}</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">{m.description}</p>
                  {m.allergens?.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-400">Contains: {m.allergens.join(", ")}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{price}</p>
                  {!r.is_available && <p className="text-xs text-neutral-500">Out of stock</p>}
                  <AddButton outletId={outletId} itemId={m.id} name={m.name} price={price} disabled={!r.is_available} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function MenuPage({ params }: { params: Promise<{ outletId: string }> }) {
  return (
    <main className="mx-auto max-w-md p-6">
      <StaffRedirect />
      <Link href="/" className="text-sm text-neutral-500">← Change outlet</Link>
      <Suspense fallback={<p className="mt-6 text-neutral-500">Loading menu...</p>}>
        <MenuLoader params={params} />
      </Suspense>
      <CartBar />
    </main>
  );
}

async function MenuLoader({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = await params;
  return <Menu outletId={outletId} />;
}