"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useProfile } from "@/lib/useProfile";

type Step = { icon: string; title: string; text: string };

const STEPS: Record<string, Step[]> = {
  customer: [
    { icon: "📍", title: "Pick your outlet", text: "Start on the home page. Tap “Use my location” to see which outlets deliver to you, nearest first." },
    { icon: "🍛", title: "Build your order", text: "Tap + to add a dish, or Customise for portions and add-ons. All prices include 5% GST." },
    { icon: "🎁", title: "Pay and win", text: "Pay by UPI, card, wallet or on delivery (test mode, no real money). After ordering, scratch your reward card for a coupon." },
    { icon: "🔔", title: "Stay updated", text: "Track your order live. The bell tells you when it is prepared, out for delivery, or when a party request is confirmed." },
  ],
  kitchen: [
    { icon: "📋", title: "Your kitchen board", text: "New orders appear in the New column by themselves. Tap Accept & start, then move them along." },
    { icon: "⏱️", title: "Keep the promise", text: "Timers turn amber, then red when late. Tap +5 min to tell the customer you need a little longer." },
    { icon: "🔔", title: "Stay alert", text: "Turn Sound on to hear new orders. The bell and the Issues badge show customer complaints for your outlet." },
  ],
  admin: [
    { icon: "🍽️", title: "Run the menu", text: "Menu & stock pauses items per outlet and edits prices. Add items creates new dishes with serving times and photos." },
    { icon: "🎉", title: "Party orders", text: "Confirm or decline requests, leave a message, and call or WhatsApp the customer from the same card." },
    { icon: "🔔", title: "Stay informed", text: "The bell and red badges show new party requests and customer issues as they happen. The Dashboard compares outlets." },
  ],
};

export default function WelcomeGuide() {
  const { profile } = useProfile();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!profile || pathname.startsWith("/login")) return;
    try {
      if (!localStorage.getItem(`darbaar-guide-${profile.id}`)) { setI(0); setOpen(true); }
    } catch {}
  }, [profile, pathname]);

  useEffect(() => {
    const h = () => { setI(0); setOpen(true); };
    window.addEventListener("darbaar-open-guide", h);
    return () => window.removeEventListener("darbaar-open-guide", h);
  }, []);

  function close() {
    setOpen(false);
    try { if (profile) localStorage.setItem(`darbaar-guide-${profile.id}`, "1"); } catch {}
  }

  const steps = STEPS[profile?.role ?? "customer"] ?? STEPS.customer;
  if (!open || !profile) return null;
  const s = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="pop w-full max-w-sm rounded-3xl bg-cream p-6 text-center text-ink">
        <div className="text-5xl">{s.icon}</div>
        <h2 className="mt-3 font-display text-xl font-bold">{s.title}</h2>
        <p className="mt-2 text-sm text-ink/70">{s.text}</p>
        <div className="mt-4 flex justify-center gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full ${k === i ? "w-5 bg-emerald" : "w-1.5 bg-ink/20"}`} />
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={close} className="flex-1 rounded-xl border border-sand py-3 text-sm font-semibold text-ink/60">
            Skip
          </button>
          <button onClick={() => (last ? close() : setI(i + 1))}
            className="flex-1 rounded-xl bg-emerald py-3 text-sm font-semibold text-white">
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}