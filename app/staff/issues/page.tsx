"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

type Ticket = {
  id: number; outlet_id: string | null; category: string; message: string;
  status: "open" | "in_progress" | "resolved"; staff_reply: string | null; created_at: string;
  orders: { order_no: string } | null; outlets: { name: string } | null;
};
type Review = {
  outlet_id: string | null; rating: number; comment: string | null; created_at: string;
  orders: { order_no: string } | null; outlets: { name: string } | null;
};
type Outlet = { id: string; name: string };

const TABS = [["open", "Open"], ["in_progress", "In progress"], ["resolved", "Resolved"]] as const;
const CAT: Record<string, string> = {
  late: "Late order", missing_item: "Missing item", wrong_item: "Wrong item",
  quality: "Food quality", packaging: "Packaging", payment: "Payment", other: "Other",
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const avgOf = (rs: Review[]) => (rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : null);

function TicketCard({ t, onChanged }: { t: Ticket; onChanged: () => void }) {
  const [reply, setReply] = useState(t.staff_reply ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function setStatus(status: string) {
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("update_ticket", { p_id: t.id, p_status: status, p_reply: reply.slice(0, 500) });
    setBusy(false);
    if (error) setErr("Could not update. Try again."); else onChanged();
  }

  return (
    <li className="rounded-2xl bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60">
        <span>HELP-{t.id} · {t.orders?.order_no ?? "no order"} · {t.outlets?.name ?? "no outlet"}</span>
        <span>{when(t.created_at)}</span>
      </div>
      <p className="mt-2 text-sm"><b>{CAT[t.category] ?? t.category}:</b> {t.message}</p>
      <textarea
        value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={500}
        placeholder="Reply to the customer (they will see it)"
        className="mt-3 w-full rounded-xl border border-sand bg-white p-2 text-sm outline-none focus:border-emerald"
      />
      {err && <p className="mt-1 text-sm text-red-700">{err}</p>}
      <div className="mt-2 flex gap-2">
        {t.status === "open" && (
          <button disabled={busy} onClick={() => setStatus("in_progress")}
            className="rounded-xl border border-emerald px-4 py-2 text-sm font-semibold text-emerald">Start</button>
        )}
        {t.status !== "resolved" && (
          <button disabled={busy} onClick={() => setStatus("resolved")}
            className="rounded-xl bg-emerald px-4 py-2 text-sm font-semibold text-white">Resolve</button>
        )}
        {t.status === "resolved" && (
          <button disabled={busy} onClick={() => setStatus("open")}
            className="rounded-xl border border-sand px-4 py-2 text-sm">Reopen</button>
        )}
      </div>
    </li>
  );
}

export default function IssuesPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outlet, setOutlet] = useState<string>("all");
  const [tab, setTab] = useState<"open" | "in_progress" | "resolved">("open");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ok">("loading");

  const isAdmin = profile?.role === "admin";

  const load = useCallback(async () => {
    const [t, r] = await Promise.all([
      supabase.from("support_tickets")
        .select("id, outlet_id, category, message, status, staff_reply, created_at, orders(order_no), outlets(name)")
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("order_reviews")
        .select("outlet_id, rating, comment, created_at, orders(order_no), outlets(name)")
        .order("created_at", { ascending: false }).limit(100),
    ]);
    if (t.error) { setState("error"); return; }
    setTickets(t.data as any);
    setReviews((r.data ?? []) as any);
    setState("ok");
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) { router.replace("/login"); return; }
    if (profile.role !== "kitchen" && profile.role !== "admin") return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [loading, profile, router, load]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("outlets").select("id, name").order("name").then(({ data }) => setOutlets(data ?? []));
  }, [isAdmin]);

  if (loading || !profile) return <main className="p-6 text-ink/60">Loading…</main>;
  if (profile.role !== "kitchen" && profile.role !== "admin")
    return <main className="p-6"><p>This page is for outlet staff only.</p></main>;

  const inScope = (id: string | null) => outlet === "all" || id === outlet;
  const scopedTickets = tickets.filter((t) => inScope(t.outlet_id));
  const scopedReviews = reviews.filter((r) => inScope(r.outlet_id));
  const shown = scopedTickets.filter((t) => t.status === tab);
  const openCount = (id: string | "all") =>
    tickets.filter((t) => t.status !== "resolved" && (id === "all" || t.outlet_id === id)).length;
  const scopedAvg = avgOf(scopedReviews);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Customer issues</h1>
        <Link href={isAdmin ? "/admin" : "/kitchen"} className="text-sm text-ink/60">← Back</Link>
      </div>

      {isAdmin && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {[{ id: "all", name: "All outlets" }, ...outlets].map((o) => (
            <button key={o.id} onClick={() => setOutlet(o.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${
                outlet === o.id ? "border-emerald bg-emerald text-white" : "border-sand bg-white"
              }`}>
              {o.name}
              {openCount(o.id) > 0 && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  outlet === o.id ? "bg-white/25" : "bg-saffron/30"
                }`}>{openCount(o.id)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-emerald text-white" : "bg-sand"}`}>
            {label} ({scopedTickets.filter((t) => t.status === k).length})
          </button>
        ))}
      </div>

      {state === "loading" && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-sand" />}
      {state === "error" && <p className="py-10 text-center">Could not load issues. <button onClick={load} className="underline">Retry</button></p>}
      {state === "ok" && shown.length === 0 && <p className="py-10 text-center text-ink/60">Nothing here.</p>}
      <ul className="mt-4 space-y-3">
        {shown.map((t) => <TicketCard key={`${t.id}-${t.status}`} t={t} onChanged={load} />)}
      </ul>

      <h2 className="mt-8 font-display text-lg font-bold">
        Ratings
        {scopedAvg !== null && (
          <span className="text-sm font-normal text-ink/60"> · average {scopedAvg.toFixed(1)} ★ ({scopedReviews.length})</span>
        )}
      </h2>

      {isAdmin && outlet === "all" && outlets.length > 0 && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {outlets.map((o) => {
            const rs = reviews.filter((r) => r.outlet_id === o.id);
            const a = avgOf(rs);
            return (
              <li key={o.id} className="rounded-xl bg-white/70 p-3 text-sm">
                <p className="font-semibold">{o.name}</p>
                <p className="text-ink/60">{a === null ? "No ratings yet" : `${a.toFixed(1)} ★ from ${rs.length}`}</p>
              </li>
            );
          })}
        </ul>
      )}

      {scopedReviews.length === 0 && <p className="mt-2 text-sm text-ink/60">No ratings yet.</p>}
      <ul className="mt-3 space-y-2">
        {scopedReviews.slice(0, 20).map((r, i) => (
          <li key={i} className="rounded-xl bg-white/70 p-3 text-sm">
            <span className="text-saffron">{"★".repeat(r.rating)}</span>
            <span className="text-ink/20">{"★".repeat(5 - r.rating)}</span>
            <span className="ml-2 text-xs text-ink/60">{r.orders?.order_no} · {r.outlets?.name}</span>
            {r.comment && <p className="mt-1">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}