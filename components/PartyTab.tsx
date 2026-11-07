"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBadge from "@/components/NavBadge";

export default function PartyTab({ className }: { className: string }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/party");
  return (
    <Link href="/party" className={`${className} ${active ? "text-saffron font-semibold" : "text-white/70"}`}>
      <span className="relative text-lg">
        🎉
        <NavBadge kind="party" className="absolute -right-3 -top-1" />
      </span>
      Party
    </Link>
  );
}