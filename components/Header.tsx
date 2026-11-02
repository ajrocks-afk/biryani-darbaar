"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";

export default function Header() {
  const { profile, loading } = useProfile();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/kitchen")) return null; // kitchen screen has its own header

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-sm">
        <Link href="/" className="font-semibold">Biryani Darbaar</Link>
        <nav className="flex items-center gap-4">
          {loading ? null : !profile ? (
            <Link href="/login" className="underline">Sign in</Link>
          ) : (
            <>
              {profile.role === "kitchen" && <Link href="/kitchen">Kitchen</Link>}
              {profile.role === "admin" && <Link href="/admin">Menu admin</Link>}
              {profile.role === "admin" && <Link href="/kitchen">Kitchen</Link>}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize">{profile.role}</span>
              <button onClick={signOut} className="text-neutral-500 underline">Sign out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}