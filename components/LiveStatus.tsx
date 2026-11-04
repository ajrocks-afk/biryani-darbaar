"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { burst } from "@/lib/confetti";

const STEPS = [
  { key: "placed", label: "Order received" },
  { key: "preparing", label: "Being prepared" },
  { key: "ready", label: "Ready for pickup" },
  { key: "handed_off", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
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
  const [anim, setAnim] = useState(0);
  const wasDelivered = useRef(initialStatus === "delivered");

  const current = Math.max(STEPS.findIndex((s) => s.key === status), 0);
  const finished = status === "delivered";

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

  // Start the line at 0 and let it grow, so the movement is visible on first load too
  useEffect(() => {
    const t = setTimeout(() => setAnim(current), 250);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (status === "delivered" && !wasDelivered.current) {
      wasDelivered.current = true;
      burst("scratch");
    }
  }, [status]);

  if (status === "cancelled")
    return <h1 className="mt-1 font-display text-3xl font-bold text-red-700">Order cancelled</h1>;

  return (
    <>
      <h1 className="mt-1 font-display text-3xl font-bold">{STEPS[current].label}</h1>
      {!finished && (
        <p className="mt-1 text-ink/60">
          Promised by <span className="font-semibold text-ink">{fmt(promisedAt)}</span>
        </p>
      )}

      <ol className="relative mt-6">
        <div className="absolute bottom-[14px] left-[13px] top-[14px] w-0.5 bg-sand">
          <div
            className="w-full bg-emerald transition-[height] duration-1000 ease-out"
            style={{ height: `${(anim / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        {STEPS.map((s, i) => {
          const done = i < current || finished;
          const active = i === current && !finished;
          return (
            <li key={s.key} className={`relative flex items-start gap-3 ${i < STEPS.length - 1 ? "min-h-[56px]" : "h-[28px]"}`}>
              <span
                key={`${s.key}-${done || active}`}
                className={`z-10 flex h-[28px] w-[28px] items-center justify-center rounded-full text-sm font-bold ${
                  done ? "pop bg-emerald text-white" : active ? "pop ring bg-saffron text-white" : "bg-sand text-ink/40"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`leading-[28px] ${done || active ? "font-semibold" : "text-ink/40"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}