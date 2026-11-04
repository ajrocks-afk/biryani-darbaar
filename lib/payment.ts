export type PayMethod = "upi" | "card" | "netbanking" | "wallet" | "cod";

export function luhnValid(num: string): boolean {
  const d = num.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(d)) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function expiryValid(v: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

export function upiValid(v: string): boolean {
  return /^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(v.trim());
}

/** Simulated gateway (test mode). Card ending 0002 and UPI IDs starting with "fail" are declined. */
export async function simulateGateway(
  method: PayMethod,
  detail: string
): Promise<{ ok: boolean; message?: string }> {
  await new Promise((r) => setTimeout(r, 1800));
  if (method === "card" && detail.replace(/\s/g, "").endsWith("0002"))
    return { ok: false, message: "Your bank declined this card (test decline). Try another method." };
  if (method === "upi" && detail.toLowerCase().startsWith("fail"))
    return { ok: false, message: "The UPI payment was not approved. Please retry." };
  return { ok: true };
}