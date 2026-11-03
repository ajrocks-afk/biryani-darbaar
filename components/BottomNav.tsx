"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { useProfile } from "@/lib/useProfile";

export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const { profile } = useProfile();

  const hidden = ["/kitchen", "/admin", "/login", "/cart", "/whoami"].some((p) => pathname.startsWith(p));
  if (hidden || (profile && profile.role !== "customer")) return null;

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]";
  const on = "font-semibold text-emerald";
  const off = "text-ink/60";

  return (
    <nav className="glass-dark fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md rounded-2xl text-white">
      <Link href="/" className={`${item} ${pathname === "/" ? "text-saffron font-semibold" : "text-white/70"}`}>
        <span className="text-lg">🏠</span>Home
      </Link>
      <Link href="/#outlets" className={`${item} text-white/70`}>
        <span className="text-lg">📍</span>Outlets
      </Link>
      <Link href="/orders" className={`${item} ${pathname.startsWith("/orders") ? "text-saffron font-semibold" : "text-white/70"}`}>
        <span className="text-lg">🧾</span>Orders
      </Link>
      <Link href="/cart" className={`${item} relative text-white/70`}>
        <span className="text-lg">🛒</span>Cart
        {count > 0 && (
          <span className="absolute right-5 top-1 rounded-full bg-terracotta px-1.5 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </Link>
      {profile ? (
        <button onClick={signOut} className={`${item} text-white/70`}>
          <span className="text-lg">👤</span>Sign out
        </button>
      ) : (
        <Link href="/login" className={`${item} text-white/70`}>
          <span className="text-lg">👤</span>Sign in
        </Link>
      )}
    </nav>
  );
}