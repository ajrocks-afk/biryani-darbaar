"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RewardsBanner from "@/components/RewardsBanner";
import PointsBadge from "@/components/PointsBadge";

type Row = {
  order_no: string;
  status: string;
  total_inr: number;
  placed_at: string;
  outlets: { name: string } | null;
  order_items: { name_snapshot: string; qty: number }[];
};

const LABEL: Record<string, string> = {
  placed: "Order received",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  handed_off: "Out for delivery",
  cancelled: "Cancelled",
  delivered: "Delivered",
};
const ACTIVE = ["placed", "preparing", "ready"];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

function Card({ o }: { o: Row }) {
  const active = ACTIVE.includes(o.status);
  const summary = o.order_items.map((i) => `${i.qty} × ${i.name_snapshot}`).join(", ");
  return (
    <li>
      <Link href={`/order/${o.order_no}`} className="glass block rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-base font-bold">{o.outlets?.name}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              o.status === "cancelled"
                ? "bg-urgent/15 text-urgent"
                : active
                ? "bg-saffron/25 text-ink"
                : "bg-emerald/10 text-emerald"
            }`}
          >
            {LABEL[o.status] ?? o.status}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-ink/70">{summary}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-ink/60">
          <span>{o.order_no} · {when(o.placed_at)}</span>
          <span className="font-semibold text-ink">₹{o.total_inr}</span>
        </div>
      </Link>
    </li>
  );
}

export default function OrdersPage() {
  const [state, setState] = useState<"loading" | "signin" | "error" | "ok">("loading");
  const [orders, setOrders] = useState<Row[]>([]);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setState("signin"); return; }
    const { data, error } = await supabase
      .from("orders")
      .select("order_no, status, total_inr, placed_at, outlets(name), order_items(name_snapshot, qty)")
      .eq("customer_id", session.user.id)
      .order("placed_at", { ascending: false })
      .limit(50);
    if (error) { setState("error"); return; }
    setOrders(data as any);
    setState("ok");
  }

  useEffect(() => {
    load();
    // refresh when any of my orders change status
    const channel = supabase
      .channel("my-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const current = orders.filter((o) => ACTIVE.includes(o.status));
  const past = orders.filter((o) => !ACTIVE.includes(o.status));

  return (
    <main className="px-4 pb-32 pt-4">
      <h1 className="font-display text-2xl font-bold">My orders</h1>
      <RewardsBanner />
      <PointsBadge />
      {state === "loading" && (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-sand" />)}
        </div>
      )}

      {state === "signin" && (
        <div className="py-14 text-center">
          <p className="text-5xl">🔒</p>
          <p className="mt-3 text-ink/70">Sign in to see your orders.</p>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-emerald px-6 py-3 font-semibold text-white">
            Sign in
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="py-14 text-center">
          <p className="text-ink/70">Could not load your orders.</p>
          <button onClick={load} className="mt-3 rounded-xl border border-emerald px-5 py-2 font-semibold text-emerald">
            Try again
          </button>
        </div>
      )}

      {state === "ok" && orders.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-5xl">🍛</p>
          <p className="mt-3 text-ink/70">You haven't ordered yet.</p>
          <Link href="/#outlets" className="mt-4 inline-block rounded-xl bg-emerald px-6 py-3 font-semibold text-white">
            Order now
          </Link>
        </div>
      )}

      {state === "ok" && current.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">In progress</h2>
          <ul className="space-y-3">{current.map((o) => <Card key={o.order_no} o={o} />)}</ul>
        </section>
      )}

      {state === "ok" && past.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">Past orders</h2>
          <ul className="space-y-3">{past.map((o) => <Card key={o.order_no} o={o} />)}</ul>
        </section>
      )}
    </main>
  );
}