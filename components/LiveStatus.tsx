"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const LABEL: Record<string, string> = {
  placed: "Order received",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  handed_off: "Out for delivery",
  cancelled: "Cancelled",
};

export default function LiveStatus({ orderNo, initial }: { orderNo: string; initial: string }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderNo}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_no=eq.${orderNo}` },
        (payload) => setStatus((payload.new as any).status)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderNo]);

  return <h1 className="mt-1 text-2xl font-semibold">{LABEL[status] ?? status}</h1>;
}