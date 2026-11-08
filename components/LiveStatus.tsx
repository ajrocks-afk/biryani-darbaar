"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchOrderLive } from "@/lib/orderStatus";
import RatingPrompt from "@/components/RatingPrompt";
import ComplaintBot from "@/components/ComplaintBot";

const STEPS = [
  { key: "placed", label: "Order received" },
  { key: "preparing", label: "Being prepared" },
  { key: "ready", label: "Ready for pickup" },
  { key: "handed_off", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

type Msg = { id: number; body: string; created_at: string };

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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [now, setNow] = useState(0);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelErr, setCancelErr] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await fetchOrderLive(orderNo);
      if (!r) return;
      setStatus(r.status);
      setPromisedAt(r.promisedAt);
      setMessages(r.messages as Msg[]);
    } catch {
      /* keep showing the last known state */
    }
  }, [orderNo]);

  const finished = status === "delivered" || status === "cancelled";

  // Backup to realtime: poll every 8 s until the order is finished
  useEffect(() => {
    refresh();
    if (finished) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh, finished]);

  // Instant updates when realtime is allowed through
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderNo}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_no=eq.${orderNo}` },
        (payload) => {
          setStatus((payload.new as any).status);
          setPromisedAt((payload.new as any).promised_at);
          refresh();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderNo, refresh]);

  // Clock for the late notice (set in an effect, as Next 16 requires)
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function cancelOrder() {
    if (!window.confirm("Cancel this order? This can't be undone.")) return;
    setCancelBusy(true);
    setCancelErr("");
    const { error } = await supabase.rpc("cancel_my_order", { p_order_no: orderNo });
    setCancelBusy(false);
    if (error) setCancelErr(error.message);
    refresh();
  }

  if (status === "cancelled")
    return <h1 className="mt-1 font-display text-3xl font-bold text-red-700">Order cancelled</h1>;

  const current = STEPS.findIndex((s) => s.key === status);
  const delivered = status === "delivered";
  const movedLater = new Date(promisedAt).getTime() > new Date(initialPromisedAt).getTime();
  const late10 =
    now > 0 &&
    ["placed", "preparing", "ready"].includes(status) &&
    now - new Date(promisedAt).getTime() >= 10 * 60_000;

  return (
    <>
      <h1 className="mt-1 font-display text-3xl font-bold">{STEPS[current]?.label ?? status}</h1>
      {!delivered && (
        <p className="mt-1 text-ink/60">
          Promised by <span className="font-semibold text-ink">{fmt(promisedAt)}</span>
        </p>
      )}
      {!delivered && movedLater && (
        <p className="mt-3 rounded-xl bg-saffron/25 p-3 text-sm font-semibold text-ink">
          The kitchen needs a little longer. Your new time is {fmt(promisedAt)}.
        </p>
      )}
      {late10 && (
        <div className="mt-3 rounded-xl bg-terracotta/10 p-3 text-sm text-terracotta">
          Sorry, your order is running late. The outlet has been alerted and is working on it.
        </div>
      )}
      <ol className="mt-6 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
              i < current || delivered ? "bg-emerald text-white" : i === current ? "bg-saffron text-white" : "bg-sand text-ink/40"
            }`}>
              {i < current || delivered ? "✓" : i + 1}
            </span>
            <span className={i <= current ? "font-semibold" : "text-ink/40"}>{s.label}</span>
          </li>
        ))}
      </ol>
      
      {status === "placed" && (
        <div className="mt-6">
          <button onClick={cancelOrder} disabled={cancelBusy}
            className="w-full rounded-xl border border-urgent py-3 text-sm font-semibold text-urgent disabled:opacity-50">
            {cancelBusy ? "Cancelling..." : "Cancel order"}
          </button>
          <p className="mt-1 text-center text-[11px] text-ink/50">Only possible until the kitchen accepts your order.</p>
          {cancelErr && <p className="mt-2 text-center text-sm text-red-700">{cancelErr}</p>}
        </div>
      )}
      
      {messages.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
            Messages (demo WhatsApp)
          </h2>
          <ul className="mt-2 space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded-xl bg-sand p-3 text-sm">
                {m.body}
                <span className="ml-2 text-xs text-ink/50">{fmt(m.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {delivered && <RatingPrompt orderNo={orderNo} />}
      <ComplaintBot orderNo={orderNo} />
    </>
  );
}