"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

export default function Header() {
  const { profile, loading } = useProfile();
  const pathname = usePathname();

  if (pathname.startsWith("/kitchen")) return null;
  const home = pathname === "/";

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const right = loading ? null : !profile ? (
    <Link href="/login" className="rounded-full bg-saffron px-4 py-1.5 text-xs font-bold text-kitchen">
      Sign in
    </Link>
  ) : (
    <div className="flex items-center gap-3 text-xs">
      {profile.role === "admin" && <Link href="/admin">Menu</Link>}
      {(profile.role === "admin" || profile.role === "kitchen") && <Link href="/kitchen">Kitchen</Link>}
      <span className="rounded-full bg-white/20 px-2.5 py-0.5 capitalize">{profile.role}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );

  if (home)
    return (
      <header className="rounded-b-3xl bg-emerald-dark px-4 pb-5 pt-4 text-white">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-bold tracking-wide">BIRYANI DARBAAR</span>
          {right}
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-widest text-white/60">Delivering to</p>
        <p className="text-sm font-semibold">📍 Hyderabad, Telangana</p>
      </header>
    );

  return (
    <header className="glass sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        <Link href="/" className="font-display text-base font-bold text-emerald">Biryani Darbaar</Link>
        <div className="text-ink [&_a]:text-ink/70 [&_span]:bg-saffron/20">{right}</div>
      </div>
    </header>
  );
}