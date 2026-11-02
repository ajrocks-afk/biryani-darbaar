"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

type Order = {
  id: string;
  order_no: string;
  status: "placed" | "preparing" | "ready";
  placed_at: string;
  promised_at: string;
  outlets: { name: string } | null;
  order_items: { name_snapshot: string; qty: number }[];
};

const NEXT = {
  placed: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "handed_off", label: "Handed to rider" },
} as const;

function KitchenScreen() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ok">("loading");
  const [outletId, setOutletId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async (oid: string | null) => {
    let q = supabase
      .from("orders")
      .select("id, order_no, status, placed_at, promised_at, outlets(name), order_items(name_snapshot, qty)")
      .in("status", ["placed", "preparing", "ready"])
      .order("placed_at");
    if (oid) q = q.eq("outlet_id", oid);
    const { data, error } = await q;
    if (error) setError("Could not load orders");
    else { setError(""); setOrders(data as any); }
  }, []);

  // 1. Check who is signed in
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: p } = await supabase
        .from("profiles").select("role, outlet_id").eq("id", session.user.id).maybeSingle();
      if (!p || (p.role !== "kitchen" && p.role !== "admin")) { setState("denied"); return; }
      setOutletId(p.outlet_id);
      setState("ok");
      load(p.outlet_id);
    })();
  }, [router, load]);

  // 2. Live updates + a backup refresh every 10 seconds
  useEffect(() => {
    if (state !== "ok") return;
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", ...(outletId ? { filter: `outlet_id=eq.${outletId}` } : {}) },
        () => load(outletId)
      )
      .subscribe();
    const poll = setInterval(() => load(outletId), 10_000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [state, outletId, load]);

  // 3. Clock for timers
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function advance(o: Order) {
    const next = NEXT[o.status].to;
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", o.id);
    if (error) { setError("Could not update order"); return; }
    await supabase.from("order_events").insert({ order_id: o.id, status: next });
    load(outletId);
  }

  async function addTime(o: Order, mins: number) {
    const newPromise = new Date(new Date(o.promised_at).getTime() + mins * 60_000).toISOString();
    const { error } = await supabase.from("orders")
      .update({ promised_at: newPromise, manager_override_minutes: mins }).eq("id", o.id);
    if (error) setError("Could not extend time");
    load(outletId);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (state === "loading") return <main className="p-6 text-neutral-500">Loading kitchen...</main>;
  if (state === "denied")
    return (
      <main className="p-6">
        <p>This screen is for kitchen staff only.</p>
        <button onClick={signOut} className="mt-3 underline">Sign out</button>
      </main>
    );

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kitchen · {orders[0]?.outlets?.name ?? "Orders"}</h1>
        <button onClick={signOut} className="text-sm text-neutral-400 underline">Sign out</button>
      </header>
      {error && <p className="mb-3 text-red-400">{error}</p>}
      {orders.length === 0 && <p className="text-xl text-neutral-400">No active orders. New orders appear here automatically.</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => {
          if (now === 0) return null;
          const minsLeft = Math.ceil((new Date(o.promised_at).getTime() - now) / 60000);
          const late = minsLeft < 0;
          const soon = !late && minsLeft <= 5;
          const critical = -minsLeft >= 10;
          const bg = late ? "bg-red-700" : soon ? "bg-amber-600" : "bg-neutral-800";
          return (
            <section key={o.id} className={`rounded-2xl p-5 ${bg}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold">{o.order_no}</h2>
                <span className="text-lg font-semibold">
                  {late ? `LATE ${-minsLeft} min` : `${minsLeft} min left`}
                </span>
              </div>
              <p className="mt-1 text-sm uppercase tracking-wide opacity-80">{o.status}</p>
              {critical && <p className="mt-1 font-bold">⚠ 10+ min late: call the customer</p>}
              <ul className="mt-3 space-y-1 text-xl">
                {o.order_items.map((i, idx) => (
                  <li key={idx}>{i.qty} × {i.name_snapshot}</li>
                ))}
              </ul>
              <button
                onClick={() => addTime(o, 5)}
                className="mt-4 w-full rounded-xl border border-white/40 py-2 text-lg"
              >
                +5 min (tell customer)
              </button>
              <button
                onClick={() => advance(o)}
                className="mt-4 w-full rounded-xl bg-white py-4 text-xl font-bold text-neutral-900"
              >
                {NEXT[o.status].label}
              </button>
            </section>
          );
        })}
      </div>
    </main>
  );
}
export default function KitchenPage() {
  return (
    <Suspense fallback={<main className="p-6 text-neutral-500">Loading kitchen...</main>}>
      <KitchenScreen />
    </Suspense>
  );
}