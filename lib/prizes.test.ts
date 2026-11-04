import { describe, it, expect } from "vitest";
import { pickPrize } from "./prizes";

describe("pickPrize", () => {
  it("lowest roll gives the smallest prize", () => expect(pickPrize(0).percent_off).toBe(5));
  it("middle roll gives 10%", () => expect(pickPrize(0.5).percent_off).toBe(10));
  it("high roll gives 15%", () => expect(pickPrize(0.8).percent_off).toBe(15));
  it("top roll gives the rare 20%", () => expect(pickPrize(0.99).percent_off).toBe(20));
});