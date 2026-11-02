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

  if (!o) return <p className="text-neutral-500">Order not found.</p>;
  const outlet: any = o.outlets;
  const promised = new Date(o.promised_at).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });

  return (
    <>
      <p className="text-sm text-neutral-500">Order {o.order_no}</p>
      <LiveStatus orderNo={o.order_no} initial={o.status} />
      <p className="mt-1 text-neutral-500">{outlet?.name} · Promised by {promised}</p>
      <ul className="mt-6 space-y-1">
        {(o.order_items as any[]).map((i, idx) => (
          <li key={idx}>{i.qty} × {i.name_snapshot}</li>
        ))}
      </ul>
      <p className="mt-4 font-medium">Total ₹{o.total_inr} <span className="text-sm font-normal text-neutral-500">(incl. ₹{o.gst_included_inr} GST)</span></p>
    </>
  );
}

export default function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  return (
    <main className="mx-auto max-w-md p-6">
      <Suspense fallback={<p className="text-neutral-500">Loading order...</p>}>
        <Order params={params} />
      </Suspense>
      <Link href="/" className="mt-8 inline-block text-sm underline">Order again</Link>
    </main>
  );
}