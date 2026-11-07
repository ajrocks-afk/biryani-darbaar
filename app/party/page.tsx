"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { MIN_NOTICE_HOURS, MIN_GUESTS, MAX_GUESTS, validateParty, toLocalInput } from "@/lib/party";
import ContactButtons from "@/components/ContactButtons";

type Req = {
  id: number; event_at: string; guests: number; status: string;
  manager_note: string | null; menu_request: string;
  outlets: { name: string; phone: string | null } | null;
};

const STATUS: Record<string, string> = {
  requested: "Waiting for confirmation",
  confirmed: "✓ Confirmed",
  declined: "Declined",
};
const field = "w-full rounded-xl border border-sand bg-white px-4 py-3 text-sm outline-none focus:border-emerald";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export default function PartyPage() {
  const { profile, loading } = useProfile();
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loadErr, setLoadErr] = useState(false);
  const [minDt, setMinDt] = useState("");
  const [outletId, setOutletId] = useState("");
  const [dt, setDt] = useState("");
  const [guests, setGuests] = useState("20");
  const [phone, setPhone] = useState("");
  const [menu, setMenu] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    setMinDt(toLocalInput(new Date(Date.now() + MIN_NOTICE_HOURS * 3_600_000)));
  }, []);

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("party_orders")
      .select("id, event_at, guests, status, manager_note, menu_request, outlets(name, phone)")
      .order("created_at", { ascending: false });
    setLoadErr(!!error);
    if (!error) setRequests((data as any as Req[]) ?? []);
  }, []);

  useEffect(() => {
    if (profile?.role !== "customer") return;
    supabase.from("outlets").select("id, name").order("name").then(({ data }) => {
      setOutlets(data ?? []);
      if (data?.length) setOutletId(data[0].id);
    });
    loadRequests();
    const t = setInterval(loadRequests, 30_000);
    const h = () => loadRequests(); // the notification system tells us when something changed
    window.addEventListener("darbaar-inbox", h);
    return () => { clearInterval(t); window.removeEventListener("darbaar-inbox", h); };
  }, [profile, loadRequests]);

  async function submit() {
    setError(""); setDone("");
    const problem = validateParty({ eventAt: new Date(dt), guests: Number(guests), phone, menu });
    if (problem) { setError(problem); return; }
    setBusy(true);
    const { error: e } = await supabase.rpc("create_party_order", {
      p_outlet: outletId,
      p_event: new Date(dt).toISOString(),
      p_guests: Number(guests),
      p_phone: phone.trim(),
      p_menu: menu,
      p_notes: notes,
    });
    setBusy(false);
    if (e) {
      setError(e.message.includes("violates") ? "Please check your details and try again." : e.message);
      return;
    }
    setDone("Request sent. The catering manager will confirm it soon.");
    setMenu(""); setNotes(""); setDt("");
    loadRequests();
  }

  const confirmedCount = requests.filter((r) => r.status === "confirmed").length;

  return (
    <main className="px-4 pb-32 pt-4">
      <Link href="/" className="text-sm text-ink/60">← Home</Link>
      <h1 className="mt-2 font-display text-2xl font-bold">Party orders</h1>
      <p className="mt-1 text-sm text-ink/60">
        Planning a get-together? Tell us what you need. Please give at least {MIN_NOTICE_HOURS} hours notice.
        Your order is confirmed once the catering manager accepts it.
      </p>

      {loading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-sand" />}

      {!loading && !profile && (
        <div className="py-12 text-center">
          <p className="text-5xl">🔒</p>
          <p className="mt-3 text-ink/70">Sign in to request a party order.</p>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-emerald px-6 py-3 font-semibold text-white">Sign in</Link>
        </div>
      )}

      {!loading && profile && profile.role !== "customer" && (
        <p className="mt-6 text-ink/70">Party requests are made from customer accounts.</p>
      )}

      {profile?.role === "customer" && (
        <>
          {confirmedCount > 0 && (
            <div className="mt-4 rounded-2xl bg-emerald p-3 text-sm font-semibold text-white">
              🎉 {confirmedCount === 1 ? "Your party request is confirmed!" : `${confirmedCount} party requests are confirmed!`}
            </div>
          )}

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink/60">Your requests</h2>
          {loadErr && <p className="mt-2 text-sm text-red-700">Could not load your requests. Please refresh.</p>}
          {!loadErr && requests.length === 0 && <p className="mt-2 text-sm text-ink/60">No party requests yet.</p>}
          <ul className="mt-2 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className={`glass rounded-2xl p-4 ${r.status === "confirmed" ? "ring-2 ring-emerald" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.outlets?.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    r.status === "confirmed" ? "bg-emerald text-white"
                    : r.status === "declined" ? "bg-urgent/15 text-urgent" : "bg-saffron/25 text-ink"}`}>
                    {STATUS[r.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/60">{when(r.event_at)} · {r.guests} guests</p>
                <p className="mt-2 text-sm">{r.menu_request}</p>
                {r.manager_note && (
                  <p className="mt-2 rounded-xl bg-sand p-3 text-sm">Catering manager: {r.manager_note}</p>
                )}
                <ContactButtons
                  phone={r.outlets?.phone}
                  label={r.status === "confirmed"
                    ? "Questions about your order? Contact the outlet:"
                    : "Have a question? Contact the outlet:"}
                  message={`Hi Biryani Darbaar ${r.outlets?.name ?? ""}, about my party request on ${when(r.event_at)} for ${r.guests} guests.`}
                />
                {r.status === "declined" && (
                  <p className="mt-2 text-xs text-ink/60">You can send a new request below with a different date or menu.</p>
                )}
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink/60">New request</h2>
          <div className="glass mt-2 space-y-3 rounded-2xl p-4">
            <label className="block text-xs font-semibold text-ink/60">Outlet
              <select className={`${field} mt-1`} value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-ink/60">Event date and time
              <input type="datetime-local" className={`${field} mt-1`} value={dt} min={minDt}
                onChange={(e) => setDt(e.target.value)} />
            </label>
            <div className="flex gap-3">
              <label className="block flex-1 text-xs font-semibold text-ink/60">Guests ({MIN_GUESTS} to {MAX_GUESTS})
                <input type="number" inputMode="numeric" className={`${field} mt-1`} value={guests}
                  onChange={(e) => setGuests(e.target.value)} />
              </label>
              <label className="block flex-1 text-xs font-semibold text-ink/60">Your mobile number
                <input inputMode="numeric" maxLength={10} className={`${field} mt-1`} value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="9876543210" />
              </label>
            </div>
            <label className="block text-xs font-semibold text-ink/60">What would you like?
              <textarea className={`${field} mt-1`} rows={3} maxLength={600} value={menu}
                onChange={(e) => setMenu(e.target.value)}
                placeholder="e.g. 20 chicken dum biryani, 10 veg biryani, 2 raita bowls" />
            </label>
            <label className="block text-xs font-semibold text-ink/60">Notes (optional)
              <input className={`${field} mt-1`} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergies, delivery instructions..." />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {done && <p className="text-sm text-green-700">{done}</p>}
            <button onClick={submit} disabled={busy}
              className="w-full rounded-2xl bg-emerald py-3.5 font-semibold text-white disabled:opacity-50">
              {busy ? "Sending..." : "Send request"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}