"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type InboxItem = {
  id: number; kind: "party" | "ticket" | "order"; title: string; body: string | null;
  link: string | null; created_at: string; read_at: string | null;
};

type Ctx = {
  items: InboxItem[];
  unread: (kind?: string) => number;
  markRead: (opts?: { ids?: number[]; kind?: string }) => Promise<void>;
};

const InboxCtx = createContext<Ctx | null>(null);
const COLS = "id, kind, title, body, link, created_at, read_at";
export const ICON = { party: "🎉", ticket: "🛠️", order: "🍛" } as const;

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [toast, setToast] = useState<InboxItem | null>(null);
  const known = useRef<Set<number> | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUid(null);
      setItems((p) => (p.length ? [] : p));
      known.current = null;
      return;
    }
    setUid(session.user.id);
    const { data, error } = await supabase
      .from("inbox").select(COLS).order("created_at", { ascending: false }).limit(30);
    if (error || !data) return;
    const list = data as InboxItem[];
    if (known.current) {
      const fresh = list.filter((i) => !known.current!.has(i.id) && !i.read_at);
      if (fresh.length) {
        setToast(fresh[0]);
        window.dispatchEvent(new Event("darbaar-inbox")); // lets open pages refresh their data
      }
    }
    known.current = new Set(list.map((i) => i.id));
    setItems(list);
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(load, 0); });
    const t = setInterval(load, 20_000);
    window.addEventListener("focus", load);
    return () => { sub.subscription.unsubscribe(); clearInterval(t); window.removeEventListener("focus", load); };
  }, [load]);

  // Instant delivery when Realtime is allowed through; polling above is the backup
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`inbox-${uid}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "inbox", filter: `user_id=eq.${uid}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const markRead = useCallback(async (opts: { ids?: number[]; kind?: string } = {}) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) =>
      !i.read_at && (!opts.ids || opts.ids.includes(i.id)) && (!opts.kind || i.kind === opts.kind)
        ? { ...i, read_at: now } : i));
    await supabase.rpc("inbox_mark_read", { p_ids: opts.ids ?? null, p_kind: opts.kind ?? null });
  }, []);

  // Being on the page a notification points to counts as reading it
  useEffect(() => {
    const ids = items.filter((i) => !i.read_at && i.link === pathname).map((i) => i.id);
    if (ids.length) markRead({ ids });
  }, [pathname, items, markRead]);

  const unread = (kind?: string) => items.filter((i) => !i.read_at && (!kind || i.kind === kind)).length;

  return (
    <InboxCtx.Provider value={{ items, unread, markRead }}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-3">
          <div role="status"
            className="pop pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-2xl border-l-4 border-emerald bg-white p-3 text-ink shadow-2xl">
            <button
              className="flex flex-1 items-start gap-3 text-left"
              onClick={() => {
                markRead({ ids: [toast.id] });
                const link = toast.link;
                setToast(null);
                if (link) router.push(link);
              }}
            >
              <span className="text-2xl">{ICON[toast.kind]}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{toast.title}</span>
                {toast.body && <span className="block truncate text-xs text-ink/70">{toast.body}</span>}
              </span>
            </button>
            <button aria-label="Dismiss" onClick={() => setToast(null)} className="px-1 text-lg leading-none text-ink/50">×</button>
          </div>
        </div>
      )}
    </InboxCtx.Provider>
  );
}

export function useInbox() {
  const c = useContext(InboxCtx);
  if (!c) throw new Error("useInbox must be used inside InboxProvider");
  return c;
}