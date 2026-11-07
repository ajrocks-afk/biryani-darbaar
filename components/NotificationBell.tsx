"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInbox, ICON } from "@/lib/inbox";
import NavBadge from "@/components/NavBadge";

function stamp(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export default function NotificationBell() {
  const { items, unread, markRead } = useInbox();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-full"
      >
        <span className="text-lg" aria-hidden>🔔</span>
        <NavBadge className="absolute -right-1 -top-1" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 max-w-[85vw] overflow-hidden rounded-2xl bg-white text-left text-ink shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-sand px-4 py-3">
            <span className="text-sm font-bold">Notifications</span>
            {unread() > 0 && (
              <button onClick={() => markRead()} className="text-xs font-semibold text-emerald">Mark all read</button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink/50">You're all caught up.</li>
            )}
            {items.map((i) => {
              const body = (
                <>
                  <span className="text-xl">{ICON[i.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{i.title}</span>
                    {i.body && <span className="block truncate text-xs text-ink/70">{i.body}</span>}
                    <span className="block text-[10px] text-ink/40">{stamp(i.created_at)}</span>
                  </span>
                  {!i.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-urgent" />}
                </>
              );
              const cls = `flex items-start gap-3 border-b border-sand/60 px-4 py-3 ${i.read_at ? "" : "bg-sand/50"}`;
              return (
                <li key={i.id}>
                  {i.link ? (
                    <Link href={i.link} className={cls} onClick={() => { markRead({ ids: [i.id] }); setOpen(false); }}>
                      {body}
                    </Link>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}