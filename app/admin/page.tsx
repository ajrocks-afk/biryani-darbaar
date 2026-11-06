"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";


type Row = {
  is_available: boolean;
  menu_items: { id: string; name: string; is_veg: boolean; item_prices: { price_inr: number }[] };
};

export default function AdminPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [outletId, setOutletId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");

  const loadItems = useCallback(async (oid: string) => {
    const { data, error } = await supabase
      .from("outlet_items")
      .select("is_available, menu_items(id, name, is_veg, item_prices(price_inr))")
      .eq("outlet_id", oid);
    if (error) setMsg("Could not load items");
    else setRows((data as any[]).sort((a, b) => a.menu_items.name.localeCompare(b.menu_items.name)));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace("/login");
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    supabase.from("outlets").select("id, name").order("name").then(({ data }) => {
      setOutlets(data ?? []);
      if (data?.length) setOutletId(data[0].id);
    });
  }, [profile]);

  useEffect(() => { if (outletId) loadItems(outletId); }, [outletId, loadItems]);

  async function toggle(itemId: string, value: boolean) {
    const { error } = await supabase.from("outlet_items")
      .update({ is_available: value }).eq("outlet_id", outletId).eq("item_id", itemId);
    setMsg(error ? "Could not update" : value ? "Item is back on the menu" : "Item paused");
    loadItems(outletId);
  }

  async function savePrice(itemId: string, price: number) {
    if (!Number.isInteger(price) || price < 1 || price > 10000) { setMsg("Enter a price between 1 and 10000"); return; }
    const { error } = await supabase.from("item_prices")
      .update({ price_inr: price }).eq("item_id", itemId).eq("city", "Hyderabad");
    setMsg(error ? "Could not save price" : "Price saved (applies to all Hyderabad outlets)");
    loadItems(outletId);
  }

  if (loading || !profile) return <main className="p-6 text-neutral-500">Loading...</main>;
  if (profile.role !== "admin")
    return <main className="p-6"><p>Menu admin is for administrators only.</p></main>;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <AdminNav current="/admin" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Menu admin</h1>
        <div className="flex gap-2 text-sm font-semibold text-emerald">
          <Link href="/admin/dashboard" className="rounded-lg border border-emerald px-3 py-1">Dashboard</Link>
          <Link href="/staff/issues" className="rounded-lg border border-emerald px-3 py-1">Issues</Link>
          <Link href="/admin/staff" className="rounded-lg border border-emerald px-3 py-1">Add staff</Link>
        </div>
      </div>
      <p className="text-sm text-neutral-500">Prices include 5% GST. Availability is per outlet.</p>

      <select value={outletId} onChange={(e) => setOutletId(e.target.value)}
        className="mt-4 rounded-lg border border-neutral-300 px-3 py-2">
        {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {msg && <p className="mt-3 text-sm text-neutral-600">{msg}</p>}

      <ul className="mt-4 divide-y divide-neutral-200">
        {rows.map((r) => {
          const m = r.menu_items;
          const price = m.item_prices?.[0]?.price_inr ?? 0;
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-sm ${m.is_veg ? "bg-green-600" : "bg-red-700"}`} />
                <span className={r.is_available ? "" : "text-neutral-400 line-through"}>{m.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>₹</span>
                <input
                  key={`${m.id}-${price}`}
                  defaultValue={price} type="number" min={1}
                  onBlur={(e) => Number(e.target.value) !== price && savePrice(m.id, Number(e.target.value))}
                  className="w-20 rounded border border-neutral-300 px-2 py-1"
                />
                <button onClick={() => toggle(m.id, !r.is_available)}
                  className="w-24 rounded-lg border border-emerald px-3 py-1 text-sm">
                  {r.is_available ? "Pause" : "Resume"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}