import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CartBar from "@/components/CartBar";
import StaffRedirect from "@/components/StaffRedirect";
import MenuClient, { type MenuEntry } from "@/components/MenuClient";

async function Menu({ outletId }: { outletId: string }) {
  const [{ data: outlet }, { data: rows, error }] = await Promise.all([
    supabase.from("outlets").select("name, fssai_no").eq("id", outletId).maybeSingle(),
    supabase
      .from("outlet_items")
      .select("is_available, menu_items(id, name, description, photo_url, category, is_veg, spice_level, allergens, item_prices(price_inr))")
      .eq("outlet_id", outletId),
  ]);

  if (error) return <p className="py-10 text-center text-red-700">Could not load the menu. Please refresh.</p>;
  if (!outlet || !rows?.length) return <p className="py-10 text-center text-ink/60">This menu is not available right now.</p>;

  const items: MenuEntry[] = (rows as any[]).map((r) => ({
    id: r.menu_items.id,
    name: r.menu_items.name,
    description: r.menu_items.description,
    photo_url: r.menu_items.photo_url,
    category: r.menu_items.category,
    is_veg: r.menu_items.is_veg,
    spice_level: r.menu_items.spice_level ?? 0,
    allergens: r.menu_items.allergens ?? [],
    price: r.menu_items.item_prices?.[0]?.price_inr ?? 0,
    available: r.is_available,
  }));

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">{outlet.name}</h1>
      <p className="mt-0.5 text-xs text-ink/60">FSSAI {outlet.fssai_no} · All prices include 5% GST</p>
      <MenuClient outletId={outletId} items={items} />
    </>
  );
}

function MenuSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-sand" />)}
    </div>
  );
}

async function MenuLoader({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = await params;
  return <Menu outletId={outletId} />;
}

export default function MenuPage({ params }: { params: Promise<{ outletId: string }> }) {
  return (
    <main className="px-4 pb-32 pt-3">
      <StaffRedirect />
      <Link href="/" className="text-sm text-ink/60">← Change outlet</Link>
      <div className="mt-2">
        <Suspense fallback={<MenuSkeleton />}>
          <MenuLoader params={params} />
        </Suspense>
      </div>
      <CartBar />
    </main>
  );
}