import { describe, it, expect } from "vitest";
import { haversineKm, rankOutlets } from "./geo";

describe("geo", () => {
  it("same point is 0 km", () => expect(haversineKm(17.46, 78.365, 17.46, 78.365)).toBeCloseTo(0, 5));
  it("Kondapur to Gachibowli is a few km", () => {
    const d = haversineKm(17.46, 78.365, 17.4401, 78.3489);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(4);
  });
  it("ranks in-range outlets first, nearest first", () => {
    const outlets = [
      { id: "far", lat: 17.4399, lng: 78.4983, delivery_radius_km: 5 },
      { id: "near", lat: 17.46, lng: 78.365, delivery_radius_km: 5 },
    ];
    const r = rankOutlets(outlets, { lat: 17.462, lng: 78.367 });
    expect(r[0].id).toBe("near");
    expect(r[0].inRange).toBe(true);
    expect(r[1].inRange).toBe(false);
  });
});