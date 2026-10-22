import { describe, expect, it } from "vitest";
import { isDeepEqual } from "./equal";

describe("isDeepEqual", () => {
  it("compares nested objects and arrays by value", () => {
    expect(isDeepEqual({ a: [1, { b: "x" }] }, { a: [1, { b: "x" }] })).toBe(
      true,
    );
    expect(isDeepEqual({ a: [1, { b: "x" }] }, { a: [1, { b: "y" }] })).toBe(
      false,
    );
  });

  it("ignores key order and keys holding undefined", () => {
    expect(isDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(isDeepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it("tells arrays of different lengths, null and objects apart", () => {
    expect(isDeepEqual([1], [1, undefined])).toBe(false);
    expect(isDeepEqual(null, {})).toBe(false);
    expect(isDeepEqual([], {})).toBe(false);
  });
});
