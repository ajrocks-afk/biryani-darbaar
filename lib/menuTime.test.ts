import { describe, it, expect } from "vitest";
import { inWindow, istMinutes, windowLabel } from "./menuTime";

describe("inWindow", () => {
  it("no window is always available", () => expect(inWindow(null, null, 300)).toBe(true));
  it("inside a daytime window", () => expect(inWindow("11:00:00", "15:00:00", 12 * 60)).toBe(true));
  it("start is included, end is excluded", () => {
    expect(inWindow("11:00:00", "15:00:00", 11 * 60)).toBe(true);
    expect(inWindow("11:00:00", "15:00:00", 15 * 60)).toBe(false);
  });
  it("outside a daytime window", () => expect(inWindow("11:00:00", "15:00:00", 16 * 60)).toBe(false));
  it("window crossing midnight", () => {
    expect(inWindow("22:00:00", "02:00:00", 23 * 60)).toBe(true);
    expect(inWindow("22:00:00", "02:00:00", 60)).toBe(true);
    expect(inWindow("22:00:00", "02:00:00", 12 * 60)).toBe(false);
  });
});

describe("istMinutes", () => {
  it("converts UTC to India time", () =>
    expect(istMinutes(new Date("2026-11-06T12:00:00Z"))).toBe(17 * 60 + 30));
});

describe("windowLabel", () => {
  it("formats the window", () => expect(windowLabel("11:00:00", "15:30:00")).toBe("11:00 AM to 3:30 PM"));
  it("returns null without a window", () => expect(windowLabel(null, null)).toBeNull());
});