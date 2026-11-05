import { describe, it, expect } from "vitest";
import { resolveOptions, type Option } from "./options";

const opts: Option[] = [
  { id: "p1", kind: "portion", name: "Regular", extra_price_inr: 0 },
  { id: "p2", kind: "portion", name: "Large", extra_price_inr: 120 },
  { id: "a1", kind: "addon", name: "Extra raita", extra_price_inr: 40 },
];

describe("resolveOptions", () => {
  it("no selection costs nothing extra", () => {
    expect(resolveOptions(opts, [])).toEqual({ ok: true, extra: 0, text: "", ids: [] });
  });
  it("adds portion and add-on prices", () => {
    const r = resolveOptions(opts, ["a1", "p2"]);
    expect(r.ok && r.extra).toBe(160);
    expect(r.ok && r.text).toBe("Large, Extra raita");
  });
  it("rejects two portions", () => {
    expect(resolveOptions(opts, ["p1", "p2"]).ok).toBe(false);
  });
  it("rejects an option from another item", () => {
    expect(resolveOptions(opts, ["zzz"]).ok).toBe(false);
  });
  it("ignores duplicate ids", () => {
    const r = resolveOptions(opts, ["a1", "a1"]);
    expect(r.ok && r.extra).toBe(40);
  });
});