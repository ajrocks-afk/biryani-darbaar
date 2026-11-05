"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { createKitchenAccount } from "@/app/admin/staffActions";

const field = "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald";

export default function StaffPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [outletId, setOutletId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !profile) router.replace("/login"); }, [loading, profile, router]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    supabase.from("outlets").select("id, name").order("name").then(({ data }) => {
      setOutlets(data ?? []);
      if (data?.length) setOutletId(data[0].id);
    });
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await createKitchenAccount({
      accessToken: session?.access_token ?? "", email, password, fullName, outletId,
    });
    setBusy(false);
    if (res.error) { setMsg({ ok: false, text: res.error }); return; }
    setMsg({ ok: true, text: `Kitchen account created for ${email}. Share the password with them privately.` });
    setFullName(""); setEmail(""); setPassword("");
  }

  if (loading || !profile) return <main className="p-6 text-neutral-500">Loading…</main>;
  if (profile.role !== "admin") return <main className="p-6">Only admins can manage staff.</main>;

  return (
    <main className="mx-auto max-w-md p-6">
      <Link href="/admin" className="text-sm text-neutral-500">← Menu admin</Link>
      <h1 className="mt-2 text-2xl font-semibold">Add kitchen staff</h1>
      <p className="text-sm text-neutral-500">They sign in on the normal login page and see only their outlet's orders and issues.</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input className={field} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className={field} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={field} type="password" placeholder="Temporary password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <select className={field} value={outletId} onChange={(e) => setOutletId(e.target.value)}>
          {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button disabled={busy} className="w-full rounded-xl bg-emerald py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Creating…" : "Create kitchen account"}
        </button>
      </form>
      {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </main>
  );
}