"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

export default function Header() {
  const { profile, loading } = useProfile();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/kitchen")) return null;

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-sand bg-cream">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
        <Link href="/" className="font-display text-xl font-bold text-emerald">
          Biryani Darbaar
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {loading ? null : !profile ? (
            <Link href="/login" className="font-medium text-emerald">Sign in</Link>
          ) : (
            <>
              {profile.role === "admin" && <Link href="/admin" className="text-ink/70">Menu</Link>}
              {(profile.role === "admin" || profile.role === "kitchen") && (
                <Link href="/kitchen" className="text-ink/70">Kitchen</Link>
              )}
              <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium capitalize">
                {profile.role}
              </span>
              <button onClick={signOut} className="text-ink/60">Sign out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}