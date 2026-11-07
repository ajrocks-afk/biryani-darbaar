"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getSeen } from "@/lib/partySeen";

export default function PartyTab({ className }: { className: string }) {
  const pathname = usePathname();
  const [unseen, setUnseen] = useState(0);

  const check = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUnseen(0); return; }
    const { data } = await supabase.from("party_orders").select("id").neq("status", "requested");
    const seen = getSeen();
    setUnseen((data ?? []).filter((r: any) => !seen.includes(r.id)).length);
  }, []);

  useEffect(() => {
    check();
    const t = setInterval(check, 30_000);
    window.addEventListener("darbaar-party-seen", check);
    return () => { clearInterval(t); window.removeEventListener("darbaar-party-seen", check); };
  }, [check, pathname]);

  const active = pathname.startsWith("/party");
  return (
    <Link href="/party" className={`${className} relative ${active ? "text-saffron font-semibold" : "text-white/70"}`}>
      <span className="text-lg">🎉</span>Party
      {unseen > 0 && (
        <span className="absolute right-5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-bold text-white">
          {unseen}
        </span>
      )}
    </Link>
  );
}