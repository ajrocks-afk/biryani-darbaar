export const SEEN_KEY = "darbaar-party-seen";

export function getSeen(): number[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function markSeen(ids: number[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("darbaar-party-seen"));
  } catch {}
}