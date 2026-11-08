"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { useProfile } from "@/lib/useProfile";

type Active = { order_no: string; status: string; promised_at: string; outlets: { name: string } | null };

const LABEL: Record<string, string> = {
  placed: "Order received",
  preparing: "Preparing your order",
  ready: "Ready, waiting for the rider",
  handed_off: "Out for delivery",
};

export default function ActiveOrderPill() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const { count } = useCart();
  const [order, setOrder] = useState<Active | null>(null);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setOrder(null); return; }
    const { data } = await supabase
      .from("orders")
      .select("order_no, status, promised_at, outlets(name)")
      .eq("customer_id", session.user.id)
      .in("status", ["placed", "preparing", "ready", "handed_off"])
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder((data as any) ?? null);
  }, []);

  useEffect(() => {
    if (profile?.role !== "customer") { setOrder(null); return; }
    load();
    const t = setInterval(load, 20_000);
    window.addEventListener("darbaar-inbox", load); // the notification system tells us when something changed
    return () => { clearInterval(t); window.removeEventListener("darbaar-inbox", load); };
  }, [profile, load]);

  // Clock is set in an effect (Next 16 rule)
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const hidden = ["/order", "/cart", "/kitchen", "/admin", "/login", "/staff", "/whoami"].some((p) =>
    pathname.startsWith(p)
  );
  if (!order || hidden || now === 0) return null;

  const mins = Math.ceil((new Date(order.promised_at).getTime() - now) / 60000);

  return (
    <Link
      href={`/order/${order.order_no}`}
      className={`glass fixed inset-x-3 z-20 mx-auto flex max-w-md items-center gap-3 rounded-full px-4 py-2.5 shadow-lg ${
        count > 0 ? "bottom-36" : "bottom-20"
      }`}
    >
      <span className="text-2xl">🍲</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{order.outlets?.name}</span>
        <span className="block truncate text-xs text-ink/70">{LABEL[order.status] ?? order.status}</span>
      </span>
      <span className="rounded-full bg-emerald px-3 py-1 text-xs font-bold text-white">
        {mins > 0 ? `${mins} min` : "soon"}
      </span>
    </Link>
  );
}