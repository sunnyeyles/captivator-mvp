import { describe, expect, it } from "vitest";
import { dominantColors } from "./dominant-colors";

function pixels(...runs: [rgba: number[], count: number][]) {
  return new Uint8ClampedArray(
    runs.flatMap(([rgba, count]) =>
      Array.from({ length: count }, () => rgba).flat(),
    ),
  );
}

describe("dominantColors", () => {
  it("returns the one colour of a solid image", () => {
    expect(dominantColors(pixels([[29, 78, 216, 255], 100]))).toEqual([
      "#1d4ed8",
    ]);
  });

  it("orders colours by the area they cover", () => {
    const image = pixels([[255, 255, 255, 255], 30], [[11, 31, 75, 255], 70]);

    expect(dominantColors(image)).toEqual(["#0b1f4b", "#ffffff"]);
  });

  it("ignores transparent pixels", () => {
    const image = pixels([[255, 0, 0, 0], 90], [[0, 128, 0, 255], 10]);

    expect(dominantColors(image)).toEqual(["#008000"]);
  });

  it("merges near-identical shades into one colour", () => {
    const image = pixels(
      [[200, 30, 30, 255], 50],
      [[208, 34, 30, 255], 40],
      [[20, 20, 20, 255], 10],
    );

    expect(dominantColors(image)).toEqual(["#c81e1e", "#141414"]);
  });

  it("keeps at most the requested number of colours", () => {
    const image = pixels(
      [[255, 0, 0, 255], 4],
      [[0, 255, 0, 255], 3],
      [[0, 0, 255, 255], 2],
      [[255, 255, 0, 255], 1],
    );

    expect(dominantColors(image, 2)).toEqual(["#ff0000", "#00ff00"]);
  });

  it("returns nothing for an empty or fully transparent image", () => {
    expect(dominantColors(new Uint8ClampedArray())).toEqual([]);
    expect(dominantColors(pixels([[0, 0, 0, 0], 5]))).toEqual([]);
  });
});
