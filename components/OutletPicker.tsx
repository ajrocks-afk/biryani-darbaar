"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rankOutlets } from "@/lib/geo";

type O = {
  id: string; name: string; fssai_no: string; is_cloud_kitchen: boolean;
  delivery_radius_km: number; lat: number; lng: number;
};
type Loc = { lat: number; lng: number; label: string };

// Demo locations so a reviewer can test the radius rule from anywhere
const DEMO: Loc[] = [
  { label: "Near Kondapur", lat: 17.462, lng: 78.367 },
  { label: "Near Kukatpally", lat: 17.496, lng: 78.401 },
  { label: "Near Gachibowli", lat: 17.441, lng: 78.35 },
  { label: "Secunderabad (outside all ranges)", lat: 17.4399, lng: 78.4983 },
];
const KEY = "darbaar-loc";

function Card({ o, distance, nearest }: { o: O; distance?: number; nearest?: boolean }) {
  return (
    <Link href={`/menu/${o.id}`} className="glass flex items-center justify-between rounded-2xl p-4">
      <div>
        <p className="font-display text-base font-bold">
          {o.name}
          {nearest && <span className="ml-2 rounded-full bg-emerald px-2 py-0.5 align-middle text-[10px] font-semibold text-white">Nearest</span>}
        </p>
        <p className="mt-0.5 text-xs text-ink/60">
          {distance !== undefined ? `${distance.toFixed(1)} km away · ` : ""}
          delivers within {o.delivery_radius_km} km · FSSAI {o.fssai_no}
        </p>
        {o.is_cloud_kitchen && (
          <span className="mt-1 inline-block rounded-full bg-terracotta/10 px-2 py-0.5 text-[10px] font-medium text-terracotta">
            Cloud kitchen
          </span>
        )}
      </div>
      <span className="text-xl text-emerald">›</span>
    </Link>
  );
}

export default function OutletPicker({ outlets }: { outlets: O[] }) {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setLoc(JSON.parse(s));
    } catch {}
  }, []);

  function choose(l: Loc | null) {
    setLoc(l);
    setMsg("");
    try {
      if (l) localStorage.setItem(KEY, JSON.stringify(l));
      else localStorage.removeItem(KEY);
    } catch {}
  }

  function useGps() {
    setMsg("");
    if (!navigator.geolocation) { setMsg("Location is not available on this device. Pick a demo area below."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); choose({ lat: p.coords.latitude, lng: p.coords.longitude, label: "your location" }); },
      () => { setBusy(false); setMsg("We couldn't get your location. Pick a demo area below."); },
      { timeout: 8000 }
    );
  }

  const ranked = loc ? rankOutlets(outlets, loc) : null;
  const anyInRange = ranked?.some((o) => o.inRange) ?? false;

  return (
    <div>
      <div className="glass rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={useGps} disabled={busy}
            className="rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {busy ? "Locating..." : "📍 Use my location"}
          </button>
          <select
            aria-label="Pick a demo location"
            value=""
            onChange={(e) => { const l = DEMO[Number(e.target.value)]; if (l) choose(l); }}
            className="min-w-0 flex-1 rounded-full border border-sand bg-white px-3 py-2 text-xs"
          >
            <option value="" disabled>Or pick a demo area</option>
            {DEMO.map((d, i) => <option key={d.label} value={i}>{d.label}</option>)}
          </select>
        </div>
        {loc && (
          <p className="mt-2 flex items-center justify-between text-xs text-ink/60">
            <span>Showing distance from {loc.label}</span>
            <button onClick={() => choose(null)} className="font-semibold text-emerald">Clear</button>
          </p>
        )}
        {msg && <p className="mt-2 text-xs text-red-700">{msg}</p>}
      </div>

      {ranked && !anyInRange && (
        <p className="mt-3 rounded-xl bg-terracotta/10 p-3 text-sm text-terracotta">
          Sorry, none of our outlets deliver to this location yet. Try another area.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {!ranked && outlets.map((o) => <li key={o.id}><Card o={o} /></li>)}
        {ranked?.map((o, i) => (
          <li key={o.id}>
            {o.inRange ? (
              <Card o={o} distance={o.distanceKm} nearest={i === 0} />
            ) : (
              <div className="glass rounded-2xl p-4 opacity-60">
                <p className="font-display text-base font-bold">{o.name}</p>
                <p className="mt-0.5 text-xs text-ink/70">
                  Outside delivery range: {o.distanceKm.toFixed(1)} km away, delivers within {o.delivery_radius_km} km
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}