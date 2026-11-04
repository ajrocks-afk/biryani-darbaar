"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Row = {
  outlet_id: string; outlet_name: string; orders_total: number; cancelled: number;
  avg_prep_minutes: number | null; repeat_customers: number; revenue_inr: number;
};
const RANGES = [
  { days: 1, label: "Last 24 h" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "error" | "ok">("loading");
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async (d: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    if (p?.role !== "admin") { setState("denied"); return; }
    const { data, error } = await supabase.rpc("dashboard_stats", { p_days: d });
    if (error) { setState("error"); return; }
    setRows((data ?? []) as Row[]);
    setState("ok");
  }, [router]);

  useEffect(() => { load(days); }, [days, load]);

  const total = rows.reduce((s, r) => s + r.orders_total, 0);
  const cancelled = rows.reduce((s, r) => s + r.cancelled, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue_inr, 0);
  const withPrep = rows.filter((r) => r.avg_prep_minutes !== null);
  const prepWeight = withPrep.reduce((s, r) => s + r.orders_total, 0);
  const avgPrep = prepWeight
    ? withPrep.reduce((s, r) => s + (r.avg_prep_minutes as number) * r.orders_total, 0) / prepWeight
    : null;

  if (state === "loading")
    return <main className="p-6 text-ink/60">Loading dashboard...</main>;
  if (state === "denied")
    return (
      <main className="p-6">
        <p>This page is for admins only.</p>
        <Link href="/login" className="mt-3 inline-block underline">Sign in as admin</Link>
      </main>
    );
  if (state === "error")
    return (
      <main className="p-6">
        <p>Could not load the dashboard.</p>
        <button onClick={() => load(days)} className="mt-3 rounded-xl border border-emerald px-5 py-2 font-semibold text-emerald">
          Try again
        </button>
      </main>
    );

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Outlet dashboard</h1>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                days === r.days ? "bg-emerald text-white" : "bg-sand text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Orders", String(total)],
          ["Cancellations", total ? `${cancelled} (${Math.round((cancelled / total) * 100)}%)` : "0"],
          ["Avg prep time", avgPrep === null ? "–" : `${avgPrep.toFixed(1)} min`],
          ["Revenue", inr(revenue)],
        ].map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{label}</p>
            <p className="mt-1 font-display text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="py-14 text-center text-ink/60">No orders in this period.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white/60">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink/60">
              <tr>
                <th className="p-3">Outlet</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Cancelled</th>
                <th className="p-3 text-right">Avg prep</th>
                <th className="p-3 text-right">Repeat customers</th>
                <th className="p-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.outlet_id} className="border-t border-ink/10">
                  <td className="p-3 font-semibold">{r.outlet_name}</td>
                  <td className="p-3 text-right">{r.orders_total}</td>
                  <td className="p-3 text-right">{r.cancelled}</td>
                  <td className="p-3 text-right">{r.avg_prep_minutes === null ? "–" : `${r.avg_prep_minutes} min`}</td>
                  <td className="p-3 text-right">{r.repeat_customers}</td>
                  <td className="p-3 text-right">{inr(r.revenue_inr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-ink/50">
        Prep time = order placed to marked ready. Repeat customers = signed-in customers with 2+ orders
        at that outlet in the period. Older orders are synthetic demo history.
      </p>
    </main>
  );
}