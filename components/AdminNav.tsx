"use client";
import Link from "next/link";
import NavBadge from "@/components/NavBadge";

const LINKS = [
  { href: "/admin", label: "Menu & stock", kind: undefined },
  { href: "/admin/items", label: "Add items", kind: undefined },
  { href: "/admin/party", label: "Party orders", kind: "party" },
  { href: "/staff/issues", label: "Customer issues", kind: "ticket" },
  { href: "/admin/dashboard", label: "Dashboard", kind: undefined },
  { href: "/admin/staff", label: "Staff", kind: undefined },
];

export default function AdminNav({ current }: { current: string }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2 text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold ${
            current === l.href ? "bg-emerald text-white" : "bg-white/70 text-ink/70"
          }`}
        >
          {l.label}
          {l.kind && <NavBadge kind={l.kind} />}
        </Link>
      ))}
    </nav>
  );
}