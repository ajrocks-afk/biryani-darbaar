"use server";
import { supabaseAdmin as db } from "@/lib/supabaseAdmin";

export async function createKitchenAccount(input: {
  accessToken: string; email: string; password: string; fullName: string; outletId: string;
}): Promise<{ ok?: true; error?: string }> {
  const { data } = await db.auth.getUser(input.accessToken);
  if (!data.user) return { error: "Your session expired. Please sign in again." };
  const { data: me } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (me?.role !== "admin") return { error: "Only admins can create staff accounts" };

  const email = input.email.trim().toLowerCase();
  const name = input.fullName.trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { error: "Enter a valid email" };
  if (name.length < 2) return { error: "Enter the staff member's name" };
  if (input.password.length < 8 || input.password.length > 72) return { error: "Password must be 8 to 72 characters" };

  const { data: outlet } = await db.from("outlets").select("id").eq("id", input.outletId).maybeSingle();
  if (!outlet) return { error: "Choose an outlet" };

  const { data: created, error } = await db.auth.admin.createUser({
    email, password: input.password, email_confirm: true, user_metadata: { full_name: name },
  });
  if (error || !created.user)
    return { error: error?.message.toLowerCase().includes("already") ? "That email is already registered" : "Could not create the account" };

  // The sign-up trigger made a customer profile. Promote it to kitchen for this outlet.
  const { error: pErr } = await db.from("profiles").upsert({
    id: created.user.id, full_name: name, role: "kitchen", outlet_id: outlet.id,
  });
  if (pErr) {
    await db.auth.admin.deleteUser(created.user.id);
    return { error: "Could not set up the account" };
  }
  return { ok: true };
}