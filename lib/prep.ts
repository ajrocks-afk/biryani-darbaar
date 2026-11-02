export type PrepItem = { baseMinutes: number; qty: number };

const EXTRA_QTY_FACTOR = 0.5;   // each extra portion of the same dish adds 50% of base time
const OTHER_DISH_FACTOR = 0.35; // other dishes cook in parallel, so they add only 35%
const MINUTES_PER_QUEUED_ITEM = 1.2;
const STATIONS = 3;             // assumption: 3 cooking stations per outlet

/** Estimated minutes to prepare this order, given how many items are already queued. */
export function estimatePrepMinutes(items: PrepItem[], queuedItemCount: number): number {
  if (items.length === 0) return 0;
  const work = items.map((i) => i.baseMinutes * (1 + EXTRA_QTY_FACTOR * (Math.max(i.qty, 1) - 1)));
  const longest = Math.max(...work);
  const rest = work.reduce((a, b) => a + b, 0) - longest;
  const own = longest + OTHER_DISH_FACTOR * rest;
  const wait = (Math.max(queuedItemCount, 0) * MINUTES_PER_QUEUED_ITEM) / STATIONS;
  return Math.ceil(own + wait);
}

/** Promise = higher of AI estimate and outlet minimum. A manager override wins. */
export function promisedMinutes(estimate: number, outletMin: number, override?: number | null): number {
  if (override != null) return override;
  return Math.max(estimate, outletMin);
}

/** Alert when an order is 10+ minutes past its promise. */
export function isCritical(promisedAt: string, nowMs: number): boolean {
  return nowMs - new Date(promisedAt).getTime() >= 10 * 60_000;
}