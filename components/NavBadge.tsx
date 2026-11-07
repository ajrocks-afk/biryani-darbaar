"use client";
import { useInbox } from "@/lib/inbox";

export default function NavBadge({ kind, className = "" }: { kind?: string; className?: string }) {
  const { unread } = useInbox();
  const n = unread(kind);
  if (n === 0) return null;
  return (
    <span
      aria-label={`${n} new`}
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}