"use server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function fetchOrderLive(orderNo: string) {
  if (!/^[A-Za-z0-9-]{4,32}$/.test(orderNo)) return null;
  const { data: o } = await supabaseAdmin
    .from("orders").select("id, status, promised_at").eq("order_no", orderNo).maybeSingle();
  if (!o) return null;
  const { data: msgs } = await supabaseAdmin
    .from("notifications").select("id, body, created_at")
    .eq("order_id", o.id).order("created_at", { ascending: false }).limit(5);
  return { status: o.status as string, promisedAt: o.promised_at as string, messages: msgs ?? [] };
}