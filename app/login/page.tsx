"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { homeFor } from "@/lib/useProfile";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        setError(error?.message ?? "Sign in failed");
        return;
      }
      const { data: profile, error: pErr } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (pErr || !profile) {
        setError("Signed in, but no role found for this account. Ask the admin to set it up.");
        return;
      }
      window.location.href = homeFor(profile.role);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-500">Biryani Darbaar staff and customers</p>
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="Email" className="mt-6 w-full rounded-lg border border-neutral-300 px-3 py-2"
      />
      <input
        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="Password" className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2"
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={signIn} disabled={busy}
        className="mt-4 w-full rounded-xl bg-neutral-900 py-3 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </main>
  );
}