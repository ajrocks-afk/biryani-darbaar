"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type T = {
  id: number; category: string; message: string; status: string;
  staff_reply: string | null; created_at: string; orders: { order_no: string } | null;
};
const STATUS: Record<string, string> = { open: "Sent", in_progress: "Being looked at", resolved: "Resolved" };

export default function SupportPage() {
  const [state, setState] = useState<"loading" | "signin" | "error" | "ok">("loading");
  const [tickets, setTickets] = useState<T[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState("signin"); return; }
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, category, message, status, staff_reply, created_at, orders(order_no)")
        .order("created_at", { ascending: false }).limit(50);
      if (error) { setState("error"); return; }
      setTickets(data as any);
      setState("ok");
    })();
  }, []);

  return (
    <main className="px-4 pb-32 pt-4">
      <Link href="/orders" className="text-sm text-ink/60">← My orders</Link>
      <h1 className="mt-2 font-display text-2xl font-bold">My help requests</h1>

      {state === "loading" && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-sand" />}
      {state === "signin" && (
        <p className="py-14 text-center text-ink/70">
          <Link href="/login" className="font-semibold underline">Sign in</Link> to see your requests.
        </p>
      )}
      {state === "error" && <p className="py-14 text-center text-ink/70">Could not load your requests.</p>}
      {state === "ok" && tickets.length === 0 && (
        <p className="py-14 text-center text-ink/70">
          No requests yet. Open any order and tap <b>Need help?</b>
        </p>
      )}
      {state === "ok" && (
        <ul className="mt-4 space-y-3">
          {tickets.map((t) => (
            <li key={t.id} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-ink/60">
                <span>HELP-{t.id}{t.orders ? ` · ${t.orders.order_no}` : ""}</span>
                <span className="rounded-full bg-saffron/25 px-2.5 py-0.5 font-semibold text-ink">
                  {STATUS[t.status] ?? t.status}
                </span>
              </div>
              <p className="mt-2 text-sm">{t.message}</p>
              {t.staff_reply && (
                <p className="mt-3 rounded-xl bg-sand p-3 text-sm"><b>Outlet:</b> {t.staff_reply}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}