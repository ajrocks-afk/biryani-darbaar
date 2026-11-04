"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { revealReward } from "@/app/rewards";
import { burst } from "@/lib/confetti";
import type { Reward } from "@/lib/prizes";

const W = 300;
const H = 170;

export default function ScratchModal({
  reward, onClose,
}: { reward: Reward; onClose: (scratched: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const moves = useRef(0);
  const done = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#d9b25f");
    g.addColorStop(0.5, "#f1dba0");
    g.addColorStop(1, "#c99a45");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(24,60,50,0.75)";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH HERE", W / 2, H / 2 + 6);
  }, []);

  function scratchAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) * (W / r.width);
    const y = (e.clientY - r.top) * (H / r.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  function clearedShare() {
    const ctx = canvasRef.current!.getContext("2d")!;
    const data = ctx.getImageData(0, 0, W, H).data;
    let cleared = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 40) {
      total++;
      if (data[i] === 0) cleared++;
    }
    return cleared / total;
  }

  async function check() {
    if (done.current || clearedShare() < 0.45) return;
    done.current = true;
    setRevealed(true);
    burst("scratch");
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await revealReward(session.access_token, reward.id);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(reward.code);
      setCopied(true);
    } catch {}
  }

  const expires = new Date(reward.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="pop w-full max-w-sm rounded-3xl bg-cream p-5 text-center">
        <h2 className="font-display text-xl font-bold">
          {revealed ? "You won! 🎉" : "You've got a scratch card!"}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          {revealed ? "Use it on your next order." : "Scratch to reveal your reward."}
        </p>

        <div className="relative mx-auto mt-4 aspect-[300/170] w-full max-w-[300px] overflow-hidden rounded-2xl">
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-dark text-white">
            <p className="font-display text-4xl font-bold text-saffron">{reward.percent_off}% OFF</p>
            <p className="mt-1 text-xs text-white/70">
              up to ₹{reward.max_discount_inr} · min order ₹{reward.min_order_inr}
            </p>
            <p className="mt-2 rounded-lg border border-dashed border-saffron px-3 py-1 text-sm font-bold tracking-widest text-saffron">
              {reward.code}
            </p>
          </div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ touchAction: "none" }}
            className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
              revealed ? "pointer-events-none opacity-0" : "cursor-pointer"
            }`}
            onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratchAt(e); }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              scratchAt(e);
              if (++moves.current % 10 === 0) check();
            }}
            onPointerUp={() => { drawing.current = false; check(); }}
          />
        </div>

        {revealed ? (
          <>
            <p className="mt-3 text-xs text-ink/60">Valid until {expires}. Find it in your cart at checkout.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={copy} className="flex-1 rounded-xl border border-emerald py-3 text-sm font-semibold text-emerald">
                {copied ? "Copied ✓" : "Copy code"}
              </button>
              <button onClick={() => onClose(true)} className="flex-1 rounded-xl bg-emerald py-3 text-sm font-semibold text-white">
                Done
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => onClose(false)} className="mt-4 text-sm text-ink/60">Maybe later</button>
        )}
      </div>
    </div>
  );
}