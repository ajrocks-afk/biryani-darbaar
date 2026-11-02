"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type CartLine = { itemId: string; name: string; price: number; qty: number };
type CartState = { outletId: string | null; lines: CartLine[] };

type CartCtx = CartState & {
  add: (outletId: string, line: Omit<CartLine, "qty">) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "darbaar-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ outletId: null, lines: [] });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const add: CartCtx["add"] = (outletId, line) =>
    setState((s) => {
      // switching outlet starts a fresh cart
      const base = s.outletId === outletId ? s.lines : [];
      const found = base.find((l) => l.itemId === line.itemId);
      const lines = found
        ? base.map((l) => (l.itemId === line.itemId ? { ...l, qty: Math.min(l.qty + 1, 20) } : l))
        : [...base, { ...line, qty: 1 }];
      return { outletId, lines };
    });

  const remove = (itemId: string) =>
    setState((s) => {
      const lines = s.lines
        .map((l) => (l.itemId === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0);
      return { outletId: lines.length ? s.outletId : null, lines };
    });

  const clear = () => setState({ outletId: null, lines: [] });

  const count = state.lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = state.lines.reduce((n, l) => n + l.qty * l.price, 0);

  return <Ctx.Provider value={{ ...state, add, remove, clear, count, subtotal }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}