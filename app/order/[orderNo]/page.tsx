"use client";
import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LiveStatus from "@/components/LiveStatus";
import OrderCelebration from "@/components/OrderCelebration";

type OrderRow = {
  order_no: string; status: string; total_inr: number; gst_included_inr: number; promised_at: string;
  outlets: { name: string } | null; order_items: { name_snapshot: string; qty: number }[];
};

function OrderView({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = use(params);
  const isNew = useSearchParams().get("new") === "1";
  const [state, setState] = useState<"loading" | "signin" | "missing" | "ok">("loading");
  const [o, setO] = useState<OrderRow | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState("signin"); return; }
      const { data } = await supabase
        .from("orders")
        .select("order_no, status, total_inr, gst_included_inr, promised_at, outlets(name), order_items(name_snapshot, qty)")
        .eq("order_no", orderNo)
        .maybeSingle();
      if (!data) { setState("missing"); return; }
      setO(data as any);
      setState("ok");
    })();
  }, [orderNo]);

  if (state === "loading") return <div className="h-64 animate-pulse rounded-2xl bg-sand" />;
  if (state === "signin")
    return (
      <div className="py-12 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Sign in to view this order</h1>
        <Link href="/login" className="mt-4 inline-block rounded-xl bg-emerald px-6 py-3 font-semibold text-white">Sign in</Link>
      </div>
    );
  if (state === "missing" || !o)
    return (
      <div className="py-12 text-center">
        <p className="text-5xl">🤔</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Order not found</h1>
        <p className="mt-1 text-ink/60">It may belong to a different account.</p>
      </div>
    );

  return (
    <>
      {isNew && <OrderCelebration orderNo={o.order_no} />}
      <p className="text-sm text-ink/60">Order {o.order_no} · {o.outlets?.name}</p>
      <LiveStatus orderNo={o.order_no} initialStatus={o.status} initialPromisedAt={o.promised_at} />
      <div className="glass mt-8 rounded-2xl p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60">Your items</h2>
        <ul className="mt-2 space-y-1">
          {o.order_items.map((i, idx) => <li key={idx}>{i.qty} × {i.name_snapshot}</li>)}
        </ul>
        <p className="mt-4 border-t border-sand pt-3 font-bold">
          Total ₹{o.total_inr}{" "}
          <span className="text-sm font-normal text-ink/60">(incl. ₹{o.gst_included_inr} GST)</span>
        </p>
      </div>
    </>
  );
}

export default function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  return (
    <main className="px-4 py-6 pb-28">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-sand" />}>
        <OrderView params={params} />
      </Suspense>
      <div className="mt-8 flex gap-6">
        <Link href="/orders" className="font-semibold text-emerald">My orders</Link>
        <Link href="/" className="font-semibold text-emerald">Order again →</Link>
      </div>
    </main>
  );
}