"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { homeFor } from "@/lib/useProfile";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) { setError(error?.message ?? "Sign in failed"); return; }
      const { data: profile, error: pErr } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (pErr || !profile) {
        setError("Signed in, but no role found for this account.");
        return;
      }
      window.location.href = homeFor(profile.role);
    } finally {
      setBusy(false);
    }
  }

  function fill(e: string) { setEmail(e); setPassword("Darbaar@123"); }

  return (
    <main className="mx-auto max-w-sm px-5 py-12">
      <h1 className="font-display text-3xl font-bold">Welcome back</h1>
      <p className="mt-1 text-ink/60">Sign in to order or manage the kitchen.</p>

      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
        className="mt-6 w-full rounded-xl border border-sand bg-white px-4 py-3 outline-none focus:border-maroon"
      />
      <input
        type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
        className="mt-3 w-full rounded-xl border border-sand bg-white px-4 py-3 outline-none focus:border-maroon"
      />
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <button
        onClick={signIn} disabled={busy}
        className="mt-4 w-full rounded-xl bg-maroon py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>

      <div className="mt-8 rounded-2xl border border-sand bg-white p-4 text-sm">
        <p className="font-semibold">Demo accounts</p>
        <p className="mt-1 text-ink/60">Tap one to fill the form (password Darbaar@123).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["customer", "kitchen", "admin"].map((r) => (
            <button key={r} onClick={() => fill(`${r}@demo.com`)}
              className="rounded-full bg-sand px-3 py-1 capitalize">{r}</button>
          ))}
        </div>
      </div>
    </main>
  );
}