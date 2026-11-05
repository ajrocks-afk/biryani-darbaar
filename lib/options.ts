export type Option = { id: string; kind: "portion" | "addon"; name: string; extra_price_inr: number };

export type Resolved =
  | { ok: true; extra: number; text: string; ids: string[] }
  | { ok: false; error: string };

/** Validates a customer's choices against the item's real options and totals the extra price. */
export function resolveOptions(available: Option[], selectedIds: string[]): Resolved {
  const ids = Array.from(new Set(selectedIds));
  const chosen: Option[] = [];
  for (const id of ids) {
    const o = available.find((a) => a.id === id);
    if (!o) return { ok: false, error: "Invalid option" };
    chosen.push(o);
  }
  if (chosen.filter((o) => o.kind === "portion").length > 1)
    return { ok: false, error: "Choose only one portion" };
  if (chosen.filter((o) => o.kind === "addon").length > 5)
    return { ok: false, error: "Too many add-ons" };

  chosen.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "portion" ? -1 : 1));
  return {
    ok: true,
    extra: chosen.reduce((s, o) => s + o.extra_price_inr, 0),
    text: chosen.map((o) => o.name).join(", "),
    ids: chosen.map((o) => o.id),
  };
}