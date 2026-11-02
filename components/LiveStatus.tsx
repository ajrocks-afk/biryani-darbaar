"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STEPS = [
  { key: "placed", label: "Order received" },
  { key: "preparing", label: "Being prepared" },
  { key: "ready", label: "Ready for pickup" },
  { key: "handed_off", label: "Out for delivery" },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export default function LiveStatus({
  orderNo, initialStatus, initialPromisedAt,
}: { orderNo: string; initialStatus: string; initialPromisedAt: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [promisedAt, setPromisedAt] = useState(initialPromisedAt);

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderNo}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_no=eq.${orderNo}` },
        (payload) => {
          setStatus((payload.new as any).status);
          setPromisedAt((payload.new as any).promised_at);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderNo]);

  if (status === "cancelled")
    return <h1 className="mt-1 font-display text-3xl font-bold text-red-700">Order cancelled</h1>;

  const current = STEPS.findIndex((s) => s.key === status);

  return (
    <>
      <h1 className="mt-1 font-display text-3xl font-bold">{STEPS[current]?.label ?? status}</h1>
      <p className="mt-1 text-ink/60">Promised by <span className="font-semibold text-ink">{fmt(promisedAt)}</span></p>
      <ol className="mt-6 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
              i < current ? "bg-maroon text-white" : i === current ? "bg-saffron text-white" : "bg-sand text-ink/40"
            }`}>
              {i < current ? "✓" : i + 1}
            </span>
            <span className={i <= current ? "font-semibold" : "text-ink/40"}>{s.label}</span>
          </li>
        ))}
      </ol>
    </>
  );
}