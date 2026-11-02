import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LiveStatus from "@/components/LiveStatus";

async function Order({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const { data: o } = await supabase
    .from("orders")
    .select("order_no, status, total_inr, gst_included_inr, promised_at, outlets(name), order_items(name_snapshot, qty)")
    .eq("order_no", orderNo)
    .maybeSingle();

  if (!o)
    return (
      <div className="py-12 text-center">
        <p className="text-5xl">🤔</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Order not found</h1>
        <p className="mt-1 text-ink/60">Check the order number and try again.</p>
      </div>
    );

  const outlet: any = o.outlets;

  return (
    <>
      <p className="text-sm text-ink/60">Order {o.order_no} · {outlet?.name}</p>
      <LiveStatus orderNo={o.order_no} initialStatus={o.status} initialPromisedAt={o.promised_at} />

      <div className="mt-8 rounded-2xl border border-sand bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Your items</h2>
        <ul className="mt-2 space-y-1">
          {(o.order_items as any[]).map((i, idx) => (
            <li key={idx}>{i.qty} × {i.name_snapshot}</li>
          ))}
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
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-sand" />}>
        <Order params={params} />
      </Suspense>
      <Link href="/" className="mt-8 inline-block font-semibold text-maroon">Order again →</Link>
    </main>
  );
}