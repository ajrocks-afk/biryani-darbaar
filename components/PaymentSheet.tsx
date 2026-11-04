"use client";
import { useState } from "react";
import { luhnValid, expiryValid, upiValid, simulateGateway, type PayMethod } from "@/lib/payment";

const UPI_CHOICES = ["Google Pay", "PhonePe", "Paytm", "Other UPI ID"];
const BANKS = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Bank"];
const WALLETS = ["Paytm Wallet", "Amazon Pay", "Mobikwik"];

const SECTIONS: { key: PayMethod; icon: string; title: string; sub: string }[] = [
  { key: "upi", icon: "📲", title: "UPI", sub: "Google Pay, PhonePe, Paytm" },
  { key: "card", icon: "💳", title: "Credit / Debit card", sub: "Visa, Mastercard, RuPay" },
  { key: "netbanking", icon: "🏦", title: "Net banking", sub: "All major banks" },
  { key: "wallet", icon: "👛", title: "Wallets", sub: "Paytm, Amazon Pay, Mobikwik" },
  { key: "cod", icon: "💵", title: "Pay on delivery", sub: "Cash or UPI to the rider" },
];

const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const fmtExp = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const field = "w-full rounded-xl border border-sand bg-white px-4 py-3 text-sm outline-none focus:border-emerald";

export default function PaymentSheet({
  total, onClose, onPaid,
}: {
  total: number;
  onClose: () => void;
  onPaid: (method: PayMethod, provider: string) => Promise<{ error?: string }>;
}) {
  const [method, setMethod] = useState<PayMethod>("upi");
  const [upiChoice, setUpiChoice] = useState(UPI_CHOICES[0]);
  const [upiId, setUpiId] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [cardName, setCardName] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [bank, setBank] = useState(BANKS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [stage, setStage] = useState<"idle" | "processing" | "success">("idle");
  const [error, setError] = useState("");

  async function pay() {
    setError("");
    let detail = "";
    let provider = "";

    if (method === "upi") {
      provider = upiChoice;
      if (upiChoice === "Other UPI ID") {
        if (!upiValid(upiId)) return setError("Enter a valid UPI ID, like name@bank");
        detail = upiId;
      }
    } else if (method === "card") {
      if (!luhnValid(cardNo)) return setError("Enter a valid card number");
      if (cardName.trim().length < 2) return setError("Enter the name on the card");
      if (!expiryValid(exp)) return setError("Enter a valid expiry (MM/YY)");
      if (!/^\d{3}$/.test(cvv)) return setError("Enter the 3-digit CVV");
      detail = cardNo;
      provider = `Card •• ${cardNo.replace(/\s/g, "").slice(-4)}`;
    } else if (method === "netbanking") {
      provider = bank;
    } else if (method === "wallet") {
      provider = wallet;
    } else {
      provider = "Pay on delivery";
    }

    setStage("processing");
    const g = await simulateGateway(method, detail);
    if (!g.ok) { setStage("idle"); setError(g.message ?? "Payment failed"); return; }

    setStage("success");
    const r = await onPaid(method, provider);
    if (r.error) { setStage("idle"); setError(r.error); }
  }

  const busy = stage !== "idle";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => !busy && onClose()}>
      <div
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-cream p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/20" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Payment options</h2>
          <button onClick={onClose} disabled={busy} className="text-sm text-ink/60">Close</button>
        </div>
        <p className="mt-1 text-xs text-ink/60">Test mode: no real money is charged.</p>

        <div className="mt-4 space-y-2">
          {SECTIONS.map((s) => {
            const open = method === s.key;
            return (
              <div key={s.key} className={`rounded-2xl border-2 bg-white ${open ? "border-emerald" : "border-sand"}`}>
                <button
                  onClick={() => { setMethod(s.key); setError(""); }}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="text-2xl">{s.icon}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{s.title}</span>
                    <span className="block text-xs text-ink/60">{s.sub}</span>
                  </span>
                  <span className={`h-4 w-4 rounded-full border-2 ${open ? "border-emerald bg-emerald" : "border-ink/30"}`} />
                </button>

                {open && (
                  <div className="space-y-3 border-t border-sand p-3">
                    {s.key === "upi" && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {UPI_CHOICES.map((u) => (
                            <button key={u} onClick={() => setUpiChoice(u)}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${upiChoice === u ? "border-emerald bg-emerald/10 text-emerald" : "border-sand"}`}>
                              {u}
                            </button>
                          ))}
                        </div>
                        {upiChoice === "Other UPI ID" && (
                          <input className={field} placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                        )}
                        <p className="text-[11px] text-ink/50">Test: any valid ID works. An ID starting with "fail" is declined.</p>
                      </>
                    )}

                    {s.key === "card" && (
                      <>
                        <input className={field} inputMode="numeric" placeholder="Card number" value={cardNo}
                          onChange={(e) => setCardNo(fmtCard(e.target.value))} />
                        <input className={field} placeholder="Name on card" value={cardName}
                          onChange={(e) => setCardName(e.target.value)} />
                        <div className="flex gap-2">
                          <input className={field} inputMode="numeric" placeholder="MM/YY" value={exp}
                            onChange={(e) => setExp(fmtExp(e.target.value))} />
                          <input className={field} inputMode="numeric" type="password" placeholder="CVV" value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                        </div>
                        <p className="text-[11px] text-ink/50">
                          Test card 4111 1111 1111 1111 succeeds. 4000 0000 0000 0002 is declined. Card details never leave your browser.
                        </p>
                      </>
                    )}

                    {s.key === "netbanking" && (
                      <div className="space-y-2">
                        {BANKS.map((b) => (
                          <label key={b} className="flex items-center gap-2 text-sm">
                            <input type="radio" name="bank" checked={bank === b} onChange={() => setBank(b)} /> {b}
                          </label>
                        ))}
                      </div>
                    )}

                    {s.key === "wallet" && (
                      <div className="space-y-2">
                        {WALLETS.map((w) => (
                          <label key={w} className="flex items-center gap-2 text-sm">
                            <input type="radio" name="wallet" checked={wallet === w} onChange={() => setWallet(w)} /> {w}
                          </label>
                        ))}
                      </div>
                    )}

                    {s.key === "cod" && (
                      <p className="text-sm text-ink/70">Pay the rider when your food arrives. Please keep the exact amount ready.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 rounded-xl bg-urgent/10 p-3 text-sm text-urgent">{error}</p>}

        <button onClick={pay} disabled={busy}
          className="mt-4 w-full rounded-2xl bg-emerald py-4 text-base font-semibold text-white disabled:opacity-50">
          {method === "cod" ? `Place order · ₹${total}` : `Pay ₹${total}`}
        </button>

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-t-3xl bg-cream/95">
            {stage === "processing" ? (
              <>
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-sand border-t-emerald" />
                <p className="mt-4 font-semibold">Processing payment…</p>
                <p className="text-xs text-ink/60">Please don't close this screen</p>
              </>
            ) : (
              <>
                <div className="pop flex h-16 w-16 items-center justify-center rounded-full bg-emerald text-3xl text-white">✓</div>
                <p className="mt-4 font-semibold">Payment successful</p>
                <p className="text-xs text-ink/60">Placing your order…</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}