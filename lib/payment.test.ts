import { describe, it, expect } from "vitest";
import { luhnValid, expiryValid, upiValid } from "./payment";

describe("payment validation", () => {
  it("accepts a valid test card", () => expect(luhnValid("4111 1111 1111 1111")).toBe(true));
  it("rejects a bad card number", () => expect(luhnValid("4111 1111 1111 1112")).toBe(false));
  it("rejects past expiry", () => expect(expiryValid("01/20", new Date("2026-11-04"))).toBe(false));
  it("accepts future expiry", () => expect(expiryValid("12/30", new Date("2026-11-04"))).toBe(true));
  it("validates UPI ids", () => {
    expect(upiValid("arya@okhdfc")).toBe(true);
    expect(upiValid("not a upi")).toBe(false);
  });
});