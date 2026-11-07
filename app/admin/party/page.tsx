"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import AdminNav from "@/components/AdminNav";

type Req = {
  id: number; event_at: string; guests: number; phone: string; status: string;
  menu_request: string; notes: string | null; manager_note: string | null;
  outlets: { name: string } | null; profiles: { full_name: string | null } | null;
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

function Card({ r, onDone }: { r: Req; onDone: (msg: string) => void }) {
  const decided = r.status !== "requested";
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(r.manager_note ?? "");
  const [busy, setBusy] = useState(false);

  async function decide(status: "confirmed" | "declined") {
    setBusy(true);
    const { error } = await supabase.rpc("update_party_order", { p_id: r.id, p_status: status, p_note: note });
    setBusy(false);
    setEditing(false);
    onDone(error ? `Could not update: ${error.message}` : `Request ${status}`);
  }

  const showControls = !decided || editing;

  return (
    <li className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{r.profiles?.full_name || "Customer"} · {r.outlets?.name}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
          r.status === "confirmed" ? "bg-emerald text-white"
          : r.status === "declined" ? "bg-urgent/15 text-urgent" : "bg-saffron/25 text-ink"}`}>
          {r.status === "requested" ? "Waiting" : r.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink/60">{when(r.event_at)} · {r.guests} guests · 📞 {r.phone}</p>
      <p className="mt-2 text-sm">{r.menu_request}</p>
      {r.notes && <p className="mt-1 text-xs text-ink/60">Notes: {r.notes}</p>}

      {decided && !editing && (
        <>
          {r.manager_note && (
            <p className="mt-3 rounded-xl bg-sand p-3 text-sm">Your message: {r.manager_note}</p>
          )}
          <button onClick={() => setEditing(true)} className="mt-3 text-sm font-semibold text-emerald">
            Change decision
          </button>
        </>
      )}

      {showControls && (
        <>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Message to the customer (optional)"
            className="mt-3 w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-emerald"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => decide("confirmed")} disabled={busy}
              className="flex-1 rounded-xl bg-emerald py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirm</button>
            <button onClick={() => decide("declined")} disabled={busy}
              className="flex-1 rounded-xl border border-urgent py-2.5 text-sm font-semibold text-urgent disabled:opacity-50">Decline</button>
          </div>
          {editing && (
            <button onClick={() => setEditing(false)} className="mt-2 text-sm text-ink/60">Cancel</button>
          )}
        </>
      )}
    </li>
  );
}

export default function AdminParty() {
  const { profile, loading } = useProfile();
  const [rows, setRows] = useState<Req[]>([]);
  const [msg, setMsg] = useState("");
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("party_orders")
      .select("id, event_at, guests, phone, status, menu_request, notes, manager_note, outlets(name), profiles(full_name)")
      .order("event_at");
    if (error) setMsg("Could not load requests");
    setRows((data as any) ?? []);
    setFetching(false);
  }, []);

  useEffect(() => { if (profile?.role === "admin") load(); }, [profile, load]);

  if (loading) return <main className="p-6 text-ink/60">Loading...</main>;
  if (profile?.role !== "admin") return <main className="p-6">Party orders are managed by administrators only.</main>;

  const pending = rows.filter((r) => r.status === "requested");
  const decided = rows.filter((r) => r.status !== "requested");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <AdminNav current="/admin/party" />
      <h1 className="font-display text-2xl font-bold">Party orders</h1>
      <p className="text-sm text-ink/60">Catering manager view: confirm or decline each request.</p>
      {msg && <p className="mt-3 text-sm text-ink/70">{msg}</p>}
      {fetching && <div className="mt-4 h-32 animate-pulse rounded-2xl bg-sand" />}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink/60">Waiting ({pending.length})</h2>
      {!fetching && pending.length === 0 && <p className="mt-2 text-sm text-ink/60">Nothing waiting.</p>}
      <ul className="mt-2 space-y-3">
        {pending.map((r) => <Card key={r.id} r={r} onDone={(m) => { setMsg(m); load(); }} />)}
      </ul>

      {decided.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink/60">Decided ({decided.length})</h2>
          <ul className="mt-2 space-y-3">
            {decided.map((r) => <Card key={r.id} r={r} onDone={(m) => { setMsg(m); load(); }} />)}
          </ul>
        </>
      )}
    </main>
  );
}