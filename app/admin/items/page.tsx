"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import AdminNav from "@/components/AdminNav";
import { windowLabel } from "@/lib/menuTime";

type Item = {
  id: string; name: string; category: string; is_veg: boolean;
  photo_url: string | null; available_from: string | null; available_to: string | null;
};

const CATEGORIES = ["Biryani", "Specials", "Starters", "Sides", "Desserts"];
const box = "w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-emerald";
const photoOk = (p: string) => p === "" || /^(\/|https:\/\/)/.test(p);

function ItemRow({ item, onMsg }: { item: Item; onMsg: (m: string) => void }) {
  const [from, setFrom] = useState(item.available_from?.slice(0, 5) ?? "");
  const [to, setTo] = useState(item.available_to?.slice(0, 5) ?? "");
  const [photo, setPhoto] = useState(item.photo_url ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!!from !== !!to) return onMsg("Set both the start and end time, or leave both empty");
    if (!photoOk(photo.trim())) return onMsg("Photo must start with / or https://");
    setBusy(true);
    const { data, error } = await supabase
      .from("menu_items")
      .update({ available_from: from || null, available_to: to || null, photo_url: photo.trim() || null })
      .eq("id", item.id)
      .select("id");
    setBusy(false);
    onMsg(error || !data?.length ? "Could not save changes" : `${item.name} updated`);
  }

  const label = windowLabel(from ? `${from}:00` : null, to ? `${to}:00` : null);

  return (
    <li className="glass rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-sm ${item.is_veg ? "bg-green-700" : "bg-red-700"}`} />
        <span className="font-semibold">{item.name}</span>
        <span className="text-xs text-ink/50">{item.category}</span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input className={box} placeholder="Photo (/food/x.jpg or https://...)" value={photo}
          onChange={(e) => setPhoto(e.target.value)} />
        <input type="time" className={box} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Served from" />
        <input type="time" className={box} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Served until" />
        <button onClick={save} disabled={busy}
          className="rounded-xl bg-emerald px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
      </div>
      <p className="mt-1 text-[11px] text-ink/50">
        {label ? `Served ${label} (India time)` : "Served all day"}
      </p>
    </li>
  );
}

export default function AdminItems() {
  const { profile, loading } = useProfile();
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [veg, setVeg] = useState(false);
  const [spice, setSpice] = useState(1);
  const [allergens, setAllergens] = useState("");
  const [prep, setPrep] = useState("15");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("id, name, category, is_veg, photo_url, available_from, available_to")
      .order("name");
    setItems((data as Item[]) ?? []);
  }, []);

  useEffect(() => { if (profile?.role === "admin") load(); }, [profile, load]);

  async function add() {
    setMsg("");
    if (name.trim().length < 2) return setMsg("Enter a dish name");
    const p = Number(price);
    if (!Number.isInteger(p) || p < 1 || p > 10000) return setMsg("Price must be a whole number from 1 to 10000");
    if (!!from !== !!to) return setMsg("Set both the start and end time, or leave both empty");
    if (!photoOk(photo.trim())) return setMsg("Photo must start with / or https://");

    setBusy(true);
    const { error } = await supabase.rpc("admin_create_item", {
      p_name: name, p_desc: desc, p_category: category, p_veg: veg, p_spice: spice,
      p_allergens: allergens.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
      p_prep: Number(prep), p_price: p, p_photo: photo.trim() || null,
      p_from: from || null, p_to: to || null,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg(`${name.trim()} added to all outlets`);
    setName(""); setDesc(""); setAllergens(""); setPrice(""); setPhoto(""); setFrom(""); setTo("");
    load();
  }

  if (loading) return <main className="p-6 text-ink/60">Loading...</main>;
  if (profile?.role !== "admin") return <main className="p-6">The menu is managed by administrators only.</main>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <AdminNav current="/admin/items" />
      <h1 className="font-display text-2xl font-bold">Add a menu item</h1>
      <p className="text-sm text-ink/60">Prices include 5% GST. New items appear at every outlet; pause them per outlet on the Menu page.</p>

      <div className="glass mt-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
        <input className={box} placeholder="Dish name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={box} placeholder="Price in ₹ (GST included)" inputMode="numeric" value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
        <input className={`${box} sm:col-span-2`} placeholder="Short description" value={desc}
          onChange={(e) => setDesc(e.target.value)} />
        <select className={box} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className={box} value={veg ? "veg" : "non"} onChange={(e) => setVeg(e.target.value === "veg")}>
          <option value="non">Non-veg</option>
          <option value="veg">Veg</option>
        </select>
        <select className={box} value={spice} onChange={(e) => setSpice(Number(e.target.value))}>
          <option value={0}>Spice: none</option>
          <option value={1}>Spice: mild</option>
          <option value={2}>Spice: medium</option>
          <option value={3}>Spice: hot</option>
        </select>
        <input className={box} placeholder="Prep minutes" inputMode="numeric" value={prep}
          onChange={(e) => setPrep(e.target.value.replace(/\D/g, ""))} />
        <input className={`${box} sm:col-span-2`} placeholder="Allergens, comma separated (e.g. dairy, nuts)"
          value={allergens} onChange={(e) => setAllergens(e.target.value)} />
        <input className={`${box} sm:col-span-2`} placeholder="Photo: /food/name.jpg or https://..."
          value={photo} onChange={(e) => setPhoto(e.target.value)} />
        <label className="text-xs font-semibold text-ink/60">Served from (optional)
          <input type="time" className={`${box} mt-1`} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-ink/60">Served until (optional)
          <input type="time" className={`${box} mt-1`} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button onClick={add} disabled={busy}
          className="rounded-xl bg-emerald py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">
          {busy ? "Adding..." : "Add item"}
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-ink/70">{msg}</p>}

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink/60">
        All items: photo and serving time
      </h2>
      <ul className="mt-2 space-y-3">
        {items.map((i) => <ItemRow key={i.id} item={i} onMsg={setMsg} />)}
      </ul>
    </main>
  );
}