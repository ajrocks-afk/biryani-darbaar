"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { homeFor } from "@/lib/useProfile";

const input =
  "w-full rounded-xl border border-sand bg-white px-4 py-3 outline-none focus:border-emerald";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function goHome(userId: string) {
    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("role").eq("id", userId).maybeSingle();
    if (pErr || !profile) {
      setError("Signed in, but no role found for this account.");
      return;
    }
    window.location.href = homeFor(profile.role);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    const mail = email.trim().toLowerCase();

    if (mode === "signup") {
      if (fullName.trim().length < 2) { setError("Please enter your name."); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (err || !data.user) { setError(err?.message ?? "Sign in failed"); return; }
        await goHome(data.user.id);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { data: { full_name: fullName.trim(), marketing_opt_in: marketing } },
        });
        if (err) { setError(err.message); return; }
        if (data.session && data.user) {
          await goHome(data.user.id);
        } else {
          setInfo("Account created. Check your email to confirm it, then sign in.");
          setMode("signin");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function fill(e: string) { setMode("signin"); setEmail(e); setPassword("Darbaar@123"); }

  return (
    <main className="mx-auto max-w-sm px-5 py-10">
      <h1 className="font-display text-3xl font-bold">
        {mode === "signin" ? "Welcome back" : "Join Biryani Darbaar"}
      </h1>
      <p className="mt-1 text-ink/60">
        {mode === "signin"
          ? "Sign in to order, or to manage your kitchen."
          : "Order direct from our outlets and earn Darbaar points."}
      </p>

      <div className="mt-6 grid grid-cols-2 rounded-xl bg-sand p-1 text-sm font-semibold">
        {(["signin", "signup"] as const).map((m) => (
          <button key={m} type="button"
            onClick={() => { setMode(m); setError(""); setInfo(""); }}
            className={`rounded-lg py-2 ${mode === m ? "bg-white shadow" : "text-ink/60"}`}>
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === "signup" && (
          <input className={input} placeholder="Full name" value={fullName}
            onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
        )}
        <input className={input} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <input className={input} type="password"
          placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
          value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"} required />

        {mode === "signup" && (
          <>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-emerald" />
              <span>
                Send me offers and updates from Biryani Darbaar by WhatsApp or SMS.
                <span className="block text-xs text-ink/50">Optional. You can say no and still order.</span>
              </span>
            </label>
            <p className="text-xs text-ink/50">
              We store your name, email and orders to run your account. We only message you about offers
              if you tick the box above.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <button disabled={busy}
          className="w-full rounded-xl bg-emerald py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "signin" && (
        <p className="mt-4 text-xs text-ink/50">
          Kitchen staff: sign in with the account your admin created for you.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-sand bg-white p-4 text-sm">
        <p className="font-semibold">Demo accounts (for reviewers)</p>
        <p className="mt-1 text-ink/60">Tap one to fill the form (password Darbaar@123).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["customer", "kitchen", "kitchen2", "kitchen3", "admin"].map((r) => (
            <button key={r} type="button" onClick={() => fill(`${r}@demo.com`)}
              className="rounded-full bg-sand px-3 py-1 capitalize">{r}</button>
          ))}
        </div>
      </div>
    </main>
  );
}