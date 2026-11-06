import Link from "next/link";

const LINKS = [
  ["/admin", "Menu & stock"],
  ["/admin/items", "Add items"],
  ["/admin/party", "Party orders"],
  ["/admin/dashboard", "Dashboard"],
  ["/admin/staff", "Staff"],
] as const;

export default function AdminNav({ current }: { current: string }) {
  return (
    <nav className="mb-5 flex flex-wrap gap-2 text-sm">
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`rounded-full px-4 py-1.5 font-semibold ${
            current === href ? "bg-emerald text-white" : "bg-white/70 text-ink/70"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}