"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RatingPrompt({ orderNo }: { orderNo: string }) {
  const key = `rating-skipped-${orderNo}`;
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { if (localStorage.getItem(key)) return; } catch { /* storage blocked: still show */ }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error: err } = await supabase
        .from("order_reviews")
        .select("order_id, orders!inner(order_no)")
        .eq("orders.order_no", orderNo)
        .limit(1);
      if (!err && data && data.length === 0) setShow(true);
    })();
  }, [orderNo, key]);

  function skip() {
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  async function submit() {
    if (rating < 1) { setError("Tap a star to rate."); return; }
    setBusy(true); setError("");
    const { error: err } = await supabase.rpc("submit_review", {
      p_order_no: orderNo, p_rating: rating, p_comment: comment.slice(0, 300),
    });
    setBusy(false);
    if (err) { setError("Could not save your rating. Please try again."); return; }
    setDone(true);
    setTimeout(() => setShow(false), 1500);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md rounded-t-3xl bg-cream p-5 pb-7">
        {done ? (
          <p className="py-6 text-center font-display text-xl font-bold">Thank you! 🙏</p>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold">How was your food?</h2>
            <p className="mt-1 text-sm text-ink/60">Optional, but it helps the kitchen.</p>
            <div className="mt-4 flex justify-center gap-2" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={`text-4xl ${n <= rating ? "text-saffron" : "text-ink/20"}`}>★</button>
              ))}
            </div>
            <textarea
              value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} rows={2}
              placeholder="Any feedback? (optional)"
              className="mt-4 w-full rounded-xl border border-sand bg-white p-3 text-sm outline-none focus:border-emerald"
            />
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={submit} disabled={busy}
                className="flex-1 rounded-xl bg-emerald py-3 font-semibold text-white disabled:opacity-50">
                {busy ? "Saving…" : "Submit"}
              </button>
              <button onClick={skip} className="rounded-xl border border-sand px-5 text-sm">Skip</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}