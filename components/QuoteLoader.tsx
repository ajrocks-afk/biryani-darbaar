"use client";
import { useEffect, useState } from "react";

const QUOTES = [
  "Good biryani can't be rushed. Neither can good things.",
  "Every grain of rice has a story. Ours begins with saffron.",
  "Slow-cooked with patience, served with pride.",
  "The aroma reaches you before the plate does.",
  "Great meals turn into great memories.",
  "A little spice makes everything nice.",
  "Happiness is a hot plate of dum biryani.",
  "Sealed with dough, opened with joy.",
  "Hunger is the best masala, and we add the rest.",
  "Share your biryani. Double the joy, half the plate.",
];

export default function QuoteLoader() {
  const [i, setI] = useState<number | null>(null);
  useEffect(() => { setI(Math.floor(Math.random() * QUOTES.length)); }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="glass max-w-sm rounded-3xl p-6 text-center">
        <div className="animate-bounce text-4xl">🍛</div>
        <p className="mt-4 min-h-[3.5rem] font-display text-lg leading-snug">
          {i === null ? "" : QUOTES[i]}
        </p>
        <p className="mt-3 text-xs uppercase tracking-widest text-ink/50">Dum cooking your page…</p>
      </div>
    </div>
  );
}