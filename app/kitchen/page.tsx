"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";


type Status = "placed" | "preparing" | "ready" | "handed_off";
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
  handed_off: { to: "delivered", label: "Mark delivered" },
} as const;

const COLUMNS: { key: Status; title: string; dot: string }[] = [
  { key: "placed", title: "New", dot: "bg-saffron" },
  { key: "preparing", title: "Preparing", dot: "bg-wait" },
  { key: "ready", title: "Ready", dot: "bg-ok" },
  { key: "handed_off", title: "Out for delivery", dot: "bg-white/60" },
];

function KitchenScreen() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ok">("loading");
  const [outletId, setOutletId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [outletName, setOutletName] = useState("All outlets");
  const [sound, setSound] = useState(false);

  const soundRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);

  function beep() {
    const ctx = audioRef.current;
    if (!ctx) return;
    [0, 0.25].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.2);
    });
  }

  function toggleSound() {
    if (!soundRef.current) {
      audioRef.current = audioRef.current ?? new AudioContext();
      audioRef.current.resume();
      soundRef.current = true;
      setSound(true);
      beep();
    } else {
      soundRef.current = false;
      setSound(false);
    }
  }

  const load = useCallback(async (oid: string | null) => {
    let q = supabase
      .from("orders")
      .select("id, order_no, status, placed_at, promised_at, outlets(name), order_items(name_snapshot, qty)")
      .in("status", ["placed", "preparing", "ready", "handed_off"])
      .order("placed_at");
    if (oid) q = q.eq("outlet_id", oid);
    const { data, error } = await q;
    if (error) { setError("Could not load orders. Retrying..."); return; }
    setError("");
    const list = data as any as Order[];
    // beep when a brand-new order appears (not on first load)
    if (seen.current && soundRef.current) {
      if (list.some((o) => o.status === "placed" && !seen.current!.has(o.id))) beep();
    }
    seen.current = new Set(list.map((o) => o.id));
    setOrders(list);
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
    setError("");
    const newPromise = new Date(new Date(o.promised_at).getTime() + mins * 60_000).toISOString();

    // show the change immediately
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, promised_at: newPromise } : x)));

    const { data, error } = await supabase
      .from("orders")
      .update({ promised_at: newPromise, manager_override_minutes: mins })
      .eq("id", o.id)
      .select("id");

    if (error) {
      setError(`Could not extend time: ${error.message}`);
      load(outletId); // undo the optimistic change
      return;
    }
    if (!data || data.length === 0) {
      setError("Could not extend time: no permission to change this order.");
      load(outletId);
      return;
    }
    load(outletId);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (state === "loading")
    return <main className="min-h-screen bg-kitchen p-6 text-white/70">Loading kitchen...</main>;
  if (state === "denied")
    return (
      <main className="min-h-screen bg-kitchen p-6 text-white">
        <p>This screen is for kitchen staff only.</p>
        <div className="flex gap-4 text-sm text-white/60">
          <Link href="/staff/issues" className="underline">Customer issues</Link>
          <button onClick={signOut} className="underline">Sign out</button>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-kitchen p-4 text-white">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Kitchen · {outletName}</h1>
          <p className="mt-1 text-sm text-white/70">
            <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-ok" />
            LIVE · {orders.length} active order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${sound ? "bg-saffron text-kitchen" : "bg-white/10 text-white"}`}
          >
            {sound ? "🔔 Sound on" : "🔕 Sound off"}
          </button>
          <button onClick={signOut} className="text-sm text-white/70 underline">Sign out</button>
        </div>
      </header>

      {error && <p className="mb-3 rounded-lg bg-urgent/20 p-3 text-white">{error}</p>}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.key);
          return (
            <section key={col.key} className="min-w-0">
              <h2 className="mb-3 flex items-center justify-between text-base font-bold uppercase tracking-wide text-white">
                <span className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${col.dot}`} />
                  {col.title}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-0.5 text-sm">{list.length}</span>
              </h2>

              <div className="space-y-4">
                {list.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/20 py-8 text-center text-sm text-white/40">
                    No orders
                  </div>
                )}
                {list.map((o) => {
                  if (now === 0) return null;
                  const minsLeft = Math.ceil((new Date(o.promised_at).getTime() - now) / 60000);
                  const done = col.key === "handed_off";
                  const late = !done && minsLeft < 0;
                  const soon = !done && !late && minsLeft <= 5;
                  const critical = late && -minsLeft >= 10;

                  const card = late ? "bg-urgent text-white" : soon ? "bg-wait text-kitchen" : "bg-white/10 text-white";
                  const strip = late ? "border-white" : soon ? "border-kitchen" : done ? "border-white/40" : "border-ok";
                  const pill = late ? "bg-white text-urgent" : soon ? "bg-kitchen text-wait" : "bg-ok text-white";

                  return (
                    <article
                      key={o.id}
                      className={`rounded-2xl border-l-8 p-5 shadow-lg ring-1 ring-white/10 ${card} ${strip}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xl font-extrabold leading-tight">{o.order_no}</h3>
                        {!done && (
                          <span className={`shrink-0 rounded-full px-3 py-1 text-base font-bold ${pill}`}>
                            {late ? `LATE ${-minsLeft}m` : `${minsLeft} min`}
                          </span>
                        )}
                      </div>

                      {critical && <p className="mt-2 font-bold">⚠ 10+ min late: call the customer</p>}

                      <ul className="mt-3 space-y-1 text-xl font-semibold">
                        {o.order_items.map((i, idx) => (
                          <li key={idx}>{i.qty} × {i.name_snapshot}</li>
                        ))}
                      </ul>

                      {(col.key === "placed" || col.key === "preparing") && (
                        <button
                          onClick={() => addTime(o, 5)}
                          className="mt-4 w-full rounded-xl border-2 border-current py-2 text-base font-semibold"
                        >
                          +5 min (tell customer)
                        </button>
                      )}
                      <button
                        onClick={() => advance(o)}
                        className="mt-3 w-full rounded-xl bg-saffron py-4 text-lg font-extrabold text-kitchen active:scale-95"
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
    <Suspense fallback={<main className="min-h-screen bg-kitchen p-6 text-white/70">Loading kitchen...</main>}>
      <KitchenScreen />
    </Suspense>
  );
}