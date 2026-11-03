"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "placed" | "preparing" | "ready";
type Order = {
  id: string;
  order_no: string;
  status: Status;
  placed_at: string;
  promised_at: string;
  outlets: { name: string } | null;
  order_items: { name_snapshot: string; qty: number }[];
};

const NEXT = {
  placed: { to: "preparing", label: "Accept & start" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "handed_off", label: "Handed to rider" },
} as const;

const COLUMNS: { key: Status; title: string }[] = [
  { key: "placed", title: "New" },
  { key: "preparing", title: "Preparing" },
  { key: "ready", title: "Ready" },
];

function KitchenScreen() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ok">("loading");
  const [outletId, setOutletId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [outletName, setOutletName] = useState("All outlets");

  const load = useCallback(async (oid: string | null) => {
    let q = supabase
      .from("orders")
      .select("id, order_no, status, placed_at, promised_at, outlets(name), order_items(name_snapshot, qty)")
      .in("status", ["placed", "preparing", "ready"])
      .order("placed_at");
    if (oid) q = q.eq("outlet_id", oid);
    const { data, error } = await q;
    if (error) setError("Could not load orders. Retrying...");
    else { setError(""); setOrders(data as any); }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: p } = await supabase
        .from("profiles").select("role, outlet_id").eq("id", session.user.id).maybeSingle();
      if (!p || (p.role !== "kitchen" && p.role !== "admin")) { setState("denied"); return; }
      setOutletId(p.outlet_id);
      if (p.outlet_id) {
        const { data: ou } = await supabase.from("outlets").select("name").eq("id", p.outlet_id).maybeSingle();
        if (ou) setOutletName(ou.name);
      }
      setState("ok");
      load(p.outlet_id);
    })();
  }, [router, load]);

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
    window.location.href = "/login";
  }

  if (state === "loading")
    return <main className="min-h-screen bg-kitchen p-6 text-white/60">Loading kitchen...</main>;
  if (state === "denied")
    return (
      <main className="min-h-screen bg-kitchen p-6 text-white">
        <p>This screen is for kitchen staff only.</p>
        <button onClick={signOut} className="mt-3 underline">Sign out</button>
      </main>
    );

  return (
    <main className="min-h-screen bg-kitchen p-4 text-white">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Kitchen · {outletName}
          </h1>
          <p className="text-sm text-white/60">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-ok" />
            LIVE · {orders.length} active order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <button onClick={signOut} className="text-sm text-white/60 underline">Sign out</button>
      </header>

      {error && <p className="mb-3 rounded-lg bg-urgent/20 p-3 text-urgent">{error}</p>}
      {orders.length === 0 && (
        <p className="py-16 text-center text-xl text-white/50">
          No active orders. New orders appear here automatically.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.key);
          return (
            <section key={col.key}>
              <h2 className="mb-3 flex items-center justify-between text-lg font-bold uppercase tracking-wide text-saffron">
                {col.title}
                <span className="rounded-full bg-white/10 px-3 py-0.5 text-sm text-white">{list.length}</span>
              </h2>
              <div className="space-y-4">
                {list.map((o) => {
                  if (now === 0) return null;
                  const minsLeft = Math.ceil((new Date(o.promised_at).getTime() - now) / 60000);
                  const late = minsLeft < 0;
                  const soon = !late && minsLeft <= 5;
                  const critical = -minsLeft >= 10;
                  const bg = late ? "bg-urgent" : soon ? "bg-wait text-kitchen" : "bg-kcard";
                  return (
                    <article key={o.id} className={`rounded-2xl p-5 ${bg}`}>
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-2xl font-bold">{o.order_no}</h3>
                        <span className="text-xl font-bold">
                          {late ? `LATE ${-minsLeft} min` : `${minsLeft} min`}
                        </span>
                      </div>
                      {critical && <p className="mt-1 font-bold">⚠ 10+ min late: call the customer</p>}
                      <ul className="mt-3 space-y-1 text-2xl">
                        {o.order_items.map((i, idx) => (
                          <li key={idx}>{i.qty} × {i.name_snapshot}</li>
                        ))}
                      </ul>
                      {col.key !== "ready" && (
                        <button
                          onClick={() => addTime(o, 5)}
                          className="mt-4 w-full rounded-xl border border-current/40 py-2 text-lg"
                        >
                          +5 min (tell customer)
                        </button>
                      )}
                      <button
                        onClick={() => advance(o)}
                        className="mt-3 w-full rounded-xl bg-saffron py-4 text-xl font-bold text-kitchen"
                      >
                        {NEXT[o.status].label}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

export default function KitchenPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-kitchen p-6 text-white/60">Loading kitchen...</main>}>
      <KitchenScreen />
    </Suspense>
  );
}