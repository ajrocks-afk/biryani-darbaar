import { describe, it, expect } from "vitest";
import { estimatePrepMinutes, promisedMinutes, isCritical } from "./prep";

describe("estimatePrepMinutes", () => {
  it("single dish, empty kitchen = base time", () => {
    expect(estimatePrepMinutes([{ baseMinutes: 20, qty: 1 }], 0)).toBe(20);
  });
  it("extra portions add time", () => {
    expect(estimatePrepMinutes([{ baseMinutes: 20, qty: 3 }], 0)).toBe(40);
  });
  it("other dishes add only a fraction", () => {
    expect(
      estimatePrepMinutes(
        [{ baseMinutes: 20, qty: 1 }, { baseMinutes: 10, qty: 1 }],
        0
      )
    ).toBe(24);
  });
  it("busy kitchen increases the estimate", () => {
    expect(estimatePrepMinutes([{ baseMinutes: 20, qty: 1 }], 15)).toBe(26);
  });
  it("empty order is 0", () => {
    expect(estimatePrepMinutes([], 5)).toBe(0);
  });
});

describe("promisedMinutes", () => {
  it("uses outlet minimum when estimate is lower", () => {
    expect(promisedMinutes(12, 25)).toBe(25);
  });
  it("uses estimate when higher", () => {
    expect(promisedMinutes(40, 25)).toBe(40);
  });
  it("manager override wins", () => {
    expect(promisedMinutes(40, 25, 15)).toBe(15);
  });
});

describe("isCritical", () => {
  const now = Date.now();
  it("false at 9 minutes late", () => {
    expect(isCritical(new Date(now - 9 * 60_000).toISOString(), now)).toBe(false);
  });
  it("true at 10 minutes late", () => {
    expect(isCritical(new Date(now - 10 * 60_000).toISOString(), now)).toBe(true);
  });
});