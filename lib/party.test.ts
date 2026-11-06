import { describe, it, expect } from "vitest";
import { validateParty } from "./party";

const now = new Date("2026-11-06T10:00:00Z");
const ok = {
  eventAt: new Date("2026-11-10T10:00:00Z"),
  guests: 40,
  phone: "9876543210",
  menu: "Chicken biryani for 40",
};

describe("validateParty", () => {
  it("accepts a valid request", () => expect(validateParty(ok, now)).toBeNull());
  it("rejects under 48 hours notice", () =>
    expect(validateParty({ ...ok, eventAt: new Date("2026-11-07T10:00:00Z") }, now)).toMatch(/48 hours/));
  it("accepts exactly 48 hours", () =>
    expect(validateParty({ ...ok, eventAt: new Date("2026-11-08T10:00:00Z") }, now)).toBeNull());
  it("rejects too few guests", () => expect(validateParty({ ...ok, guests: 5 }, now)).toMatch(/Guests/));
  it("rejects a bad phone", () => expect(validateParty({ ...ok, phone: "12345" }, now)).toMatch(/mobile/));
  it("rejects an empty menu request", () => expect(validateParty({ ...ok, menu: " " }, now)).toMatch(/order/));
});