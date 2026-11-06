export const MIN_NOTICE_HOURS = 48; // assumption
export const MIN_GUESTS = 10;
export const MAX_GUESTS = 500;

export type PartyInput = { eventAt: Date; guests: number; phone: string; menu: string };

export function validateParty(i: PartyInput, now: Date = new Date()): string | null {
  if (Number.isNaN(i.eventAt.getTime())) return "Choose the event date and time";
  if (i.eventAt.getTime() < now.getTime() + MIN_NOTICE_HOURS * 3_600_000)
    return `Party orders need at least ${MIN_NOTICE_HOURS} hours notice`;
  if (!Number.isInteger(i.guests) || i.guests < MIN_GUESTS || i.guests > MAX_GUESTS)
    return `Guests must be between ${MIN_GUESTS} and ${MAX_GUESTS}`;
  if (!/^[6-9]\d{9}$/.test(i.phone.trim())) return "Enter a valid 10-digit mobile number";
  if (i.menu.trim().length < 5) return "Tell us what you would like to order";
  return null;
}

/** Format a Date for <input type="datetime-local"> in the browser's local time. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}