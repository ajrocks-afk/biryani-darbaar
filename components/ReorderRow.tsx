"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FoodImage from "@/components/FoodImage";

type Suggestion = {
  itemId: string; name: string; photo: string | null;
  outletId: string; outletName: string; times: number;
};

export default function ReorderRow() {
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: orders } = await supabase
        .from("orders")
        .select("outlet_id, outlets(name), order_items(item_id, name_snapshot)")
        .eq("customer_id", session.user.id)
        .neq("status", "cancelled")
        .order("placed_at", { ascending: false })
        .limit(15);
      if (!orders?.length) return;

      // Count how often each dish was ordered at each outlet (most recent first)
      const map = new Map<string, Suggestion>();
      for (const o of orders as any[]) {
        for (const i of o.order_items ?? []) {
          const k = `${o.outlet_id}|${i.item_id}`;
          const cur = map.get(k);
          if (cur) cur.times += 1;
          else map.set(k, {
            itemId: i.item_id, name: i.name_snapshot, photo: null,
            outletId: o.outlet_id, outletName: o.outlets?.name ?? "", times: 1,
          });
        }
      }
      const top = [...map.values()].sort((a, b) => b.times - a.times).slice(0, 4);
      if (!top.length) return;

      const { data: photos } = await supabase
        .from("menu_items").select("id, photo_url").in("id", top.map((t) => t.itemId));
      const byId = new Map((photos ?? []).map((p: any) => [p.id, p.photo_url]));
      setItems(top.map((t) => ({ ...t, photo: byId.get(t.itemId) ?? null })));
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-1 font-display text-lg font-bold">Order again</h2>
      <p className="mb-3 text-xs text-ink/60">Based on your past orders. Nothing is added until you choose.</p>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {items.map((s) => (
          <Link key={`${s.outletId}|${s.itemId}`} href={`/menu/${s.outletId}`}
            className="glass w-36 shrink-0 overflow-hidden rounded-2xl">
            <div className="h-24 w-full"><FoodImage src={s.photo} alt={s.name} /></div>
            <div className="p-2.5">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="truncate text-[11px] text-ink/60">{s.outletName}</p>
              <p className="mt-1 text-[11px] font-semibold text-emerald">View in menu →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}