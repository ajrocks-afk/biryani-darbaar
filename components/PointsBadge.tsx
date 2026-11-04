"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PointsBadge() {
  const [pts, setPts] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("loyalty_ledger").select("points");
      setPts((data ?? []).reduce((sum: number, r: any) => sum + r.points, 0));
    })();
  }, []);

  if (pts === null) return null;
  return (
    <div className="glass mt-3 flex items-center justify-between rounded-2xl p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Darbaar points</p>
        <p className="font-display text-2xl font-bold text-emerald">{pts}</p>
      </div>
      <p className="max-w-[55%] text-right text-xs text-ink/60">
      Earn 1 point per ₹20 on delivered orders. Redeem at checkout: 1 point = ₹1, minimum 50, up to 20% of the order.
      </p>
    </div>
  );
}