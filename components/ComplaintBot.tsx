"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { key: "late", label: "Order is late" },
  { key: "missing_item", label: "Item missing" },
  { key: "wrong_item", label: "Wrong item" },
  { key: "quality", label: "Food quality" },
  { key: "packaging", label: "Packaging or spill" },
  { key: "payment", label: "Payment issue" },
  { key: "other", label: "Something else" },
] as const;

type Cat = (typeof CATEGORIES)[number];

function Bot({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-sand px-3 py-2 text-sm">{children}</p>;
}
function Me({ children }: { children: React.ReactNode }) {
  return <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-emerald px-3 py-2 text-sm text-white">{children}</p>;
}

export default function ComplaintBot({ orderNo }: { orderNo: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Cat | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState<number | null>(null);

  function reset() {
    setCategory(null); setText(""); setError(""); setTicketId(null);
  }

  async function send() {
    if (!category) return;
    if (text.trim().length < 5) { setError("Please write a few words so the outlet can help."); return; }
    setBusy(true); setError("");
    const { data, error: err } = await supabase.rpc("create_ticket", {
      p_order_no: orderNo, p_category: category.key, p_message: text.trim().slice(0, 500),
    });
    setBusy(false);
    if (err) {
      setError(err.message.includes("too many")
        ? "You already have 5 open requests. Please wait for a reply."
        : "Could not send your request. Please try again.");
      return;
    }
    setTicketId(data as number);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-8 w-full rounded-2xl border border-emerald bg-white/70 p-4 text-left"
      >
        <span className="block text-sm font-semibold">Something wrong with your order?</span>
        <span className="block text-xs text-ink/60">Chat with our help assistant. It goes straight to the outlet.</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Help with {orderNo}</h2>
              <button onClick={() => setOpen(false)} className="text-sm text-ink/60">Close</button>
            </div>

            <div className="mt-4 space-y-3">
              <Bot>Hi! Sorry something went wrong. What is the problem?</Bot>

              {!category && (
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setCategory(c)}
                      className="rounded-full border border-emerald px-3 py-1.5 text-sm font-semibold text-emerald">
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {category && (
                <>
                  <Me>{category.label}</Me>
                  {ticketId === null && (
                    <>
                      <Bot>Thanks. Tell us a little more and we will send it straight to the outlet.</Bot>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="What happened?"
                        className="w-full rounded-xl border border-sand bg-white p-3 text-sm outline-none focus:border-emerald"
                      />
                      {error && <p className="text-sm text-red-700">{error}</p>}
                      <div className="flex gap-2">
                        <button onClick={send} disabled={busy}
                          className="flex-1 rounded-xl bg-emerald py-3 font-semibold text-white disabled:opacity-50">
                          {busy ? "Sending…" : "Send to outlet"}
                        </button>
                        <button onClick={reset} disabled={busy}
                          className="rounded-xl border border-sand px-4 text-sm">Back</button>
                      </div>
                    </>
                  )}
                  {ticketId !== null && (
                    <>
                      <Me>{text}</Me>
                      <Bot>
                        Done. Your request HELP-{ticketId} has gone to the outlet. Their reply will show here
                        under Messages, and in <Link href="/support" className="font-semibold underline">My help requests</Link>.
                      </Bot>
                    </>
                  )}
                </>
              )}
            </div>
            <p className="mt-4 text-[11px] text-ink/50">
              This is a guided form, not an AI. Your request is read by outlet staff.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}