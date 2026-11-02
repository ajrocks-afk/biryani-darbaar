"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "customer" | "kitchen" | "admin";
  outlet_id: string | null;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setProfile(null); setLoading(false); return; }
      const { data: p } = await supabase
        .from("profiles").select("full_name, role, outlet_id")
        .eq("id", session.user.id).maybeSingle();
      setProfile(p ? { id: session.user.id, email: session.user.email ?? "", ...p } as Profile : null);
      setLoading(false);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(load, 0); });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { profile, loading };
}

export function homeFor(role?: string) {
  return role === "admin" ? "/admin" : role === "kitchen" ? "/kitchen" : "/";
}