"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { tierFor } from "@/lib/loyalty";

export default function PointsBadge() {
  const [info, setInfo] = useState<{ points: number; delivered_90d: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.rpc("my_loyalty");
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setInfo(row);
    })();
  }, []);

  if (!info) return null;
  const tier = tierFor(info.delivered_90d);

  return (
    <div className="glass mt-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Darbaar points</p>
          <p className="font-display text-2xl font-bold text-emerald">{info.points}</p>
        </div>
        <span className="rounded-full bg-saffron/25 px-3 py-1 text-sm font-bold">{tier.name}</span>
      </div>
      <p className="mt-2 text-xs text-ink/60">
        {tier.next
          ? `${tier.toNext} more delivered order${tier.toNext === 1 ? "" : "s"} in 90 days to reach ${tier.next}. `
          : "You're on our top tier. "}
        Earn 1 point per ₹20 when an order is delivered (Silver ×1.25, Gold ×1.5).
        Redeem at checkout: 1 point = ₹1, minimum 50, up to 20% of the order.
      </p>
    </div>
  );
}