"use server";
import { supabaseAdmin as db } from "@/lib/supabaseAdmin";
import type { Reward } from "@/lib/prizes";

async function userId(token: string) {
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user?.id ?? null;
}

const COLS = "id, code, percent_off, max_discount_inr, min_order_inr, expires_at";

/** Oldest-first would hide new cards, so newest unscratched card for this user. */
export async function getPendingReward(accessToken: string, orderNo?: string): Promise<Reward | null> {
  const uid = await userId(accessToken);
  if (!uid) return null;
  let q = db.from("user_coupons").select(COLS)
    .eq("user_id", uid).eq("scratched", false).gt("expires_at", new Date().toISOString());
  if (orderNo) q = q.eq("source_order_no", orderNo);
  const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as Reward) ?? null;
}

export async function revealReward(accessToken: string, rewardId: string): Promise<{ ok: boolean }> {
  const uid = await userId(accessToken);
  if (!uid) return { ok: false };
  const { error } = await db.from("user_coupons")
    .update({ scratched: true }).eq("id", rewardId).eq("user_id", uid);
  return { ok: !error };
}

export async function myCoupons(accessToken: string): Promise<Reward[]> {
  const uid = await userId(accessToken);
  if (!uid) return [];
  const { data } = await db.from("user_coupons").select(COLS)
    .eq("user_id", uid).eq("scratched", true).eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data as Reward[]) ?? [];
}