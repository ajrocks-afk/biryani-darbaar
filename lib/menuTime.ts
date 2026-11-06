export function toMinutes(t: string | null | undefined): number | null {
	if (!t) return null;
	const m = /^(\d{2}):(\d{2})/.exec(t);
	return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  
  /** True when the item can be sold at this minute of the day. Handles windows that cross midnight. */
  export function inWindow(from: string | null, to: string | null, nowMin: number): boolean {
	const f = toMinutes(from);
	const t = toMinutes(to);
	if (f === null || t === null || f === t) return true; // no window means always available
	return f < t ? nowMin >= f && nowMin < t : nowMin >= f || nowMin < t;
  }
  
  /** Minutes since midnight in India time. */
  export function istMinutes(d: Date): number {
	const parts = new Intl.DateTimeFormat("en-GB", {
	  hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata",
	}).formatToParts(d);
	const h = Number(parts.find((p) => p.type === "hour")!.value) % 24;
	const m = Number(parts.find((p) => p.type === "minute")!.value);
	return h * 60 + m;
  }
  
  export function fmt12(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	const h12 = h % 12 === 0 ? 12 : h % 12;
	return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }
  
  export function windowLabel(from: string | null, to: string | null): string | null {
	const f = toMinutes(from);
	const t = toMinutes(to);
	if (f === null || t === null || f === t) return null;
	return `${fmt12(f)} to ${fmt12(t)}`;
  }