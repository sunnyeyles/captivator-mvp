import type { Device } from "@repo/portal";
import { describe, expect, it } from "vitest";
import {
  cropPosition,
  dragPosition,
  nudgePosition,
  type BackgroundGeometry,
  type Rect,
  type Size,
} from "./background-geometry";
import { deviceFrames } from "./device-frames";

const centred = { x: 50, y: 50 };

// A 2:1 image in a 1280 x 800 frame covers at 1600 x 800, so x has 320px of slack and y none
const wideCover: BackgroundGeometry = {
  frame: { width: 1280, height: 800 },
  natural: { width: 2000, height: 1000 },
  fit: "cover",
};

// The same image contained renders 1280 x 640, leaving 160px of vertical letterbox
const wideContain: BackgroundGeometry = { ...wideCover, fit: "contain" };

// A tall image covering the mobile frame overflows vertically
const tallCover: BackgroundGeometry = {
  frame: { width: 390, height: 844 },
  natural: { width: 1000, height: 4000 },
  fit: "cover",
};

describe("dragPosition", () => {
  it("moves a covering image the way the pointer moves on the cropped axis", () => {
    expect(dragPosition(centred, { x: 32, y: 0 }, 1, wideCover)).toEqual({
      x: 40,
      y: 50,
    });
    expect(dragPosition(centred, { x: -32, y: 0 }, 1, wideCover)).toEqual({
      x: 60,
      y: 50,
    });
  });

  it("moves a covering image vertically", () => {
    // 390 wide at scale 0.39 renders 1560 tall, so y has 716px of slack
    expect(dragPosition(centred, { x: 0, y: -71.6 }, 1, tallCover)).toEqual({
      x: 50,
      y: 60,
    });
  });

  it("leaves an axis with no slack where it is", () => {
    expect(dragPosition(centred, { x: 0, y: 200 }, 1, wideCover)).toEqual(
      centred,
    );
    expect(dragPosition(centred, { x: 500, y: 0 }, 1, tallCover)).toEqual(
      centred,
    );
  });

  it("moves a contained image within its letterbox", () => {
    expect(dragPosition(centred, { x: 0, y: 16 }, 1, wideContain)).toEqual({
      x: 50,
      y: 60,
    });
    expect(dragPosition(centred, { x: 100, y: 0 }, 1, wideContain)).toEqual(
      centred,
    );
  });

  it("clamps to the image edges", () => {
    expect(dragPosition(centred, { x: 5000, y: 0 }, 1, wideCover)).toEqual({
      x: 0,
      y: 50,
    });
    expect(dragPosition(centred, { x: -5000, y: 0 }, 1, wideCover)).toEqual({
      x: 100,
      y: 50,
    });
    expect(dragPosition(centred, { x: 0, y: 5000 }, 1, wideContain)).toEqual({
      x: 50,
      y: 100,
    });
  });

  it("converts screen pixels to page pixels by the canvas scale", () => {
    expect(dragPosition(centred, { x: 16, y: 0 }, 0.5, wideCover)).toEqual({
      x: 40,
      y: 50,
    });
  });

  it("treats an image matching the frame's shape as having nothing to move", () => {
    const matching: BackgroundGeometry = {
      frame: { width: 1280, height: 800 },
      natural: { width: 640, height: 400 },
      fit: "cover",
    };
    expect(dragPosition(centred, { x: 300, y: 300 }, 1, matching)).toEqual(
      centred,
    );
  });
});

describe("nudgePosition", () => {
  it("moves a covering image one point the way the arrow points", () => {
    expect(nudgePosition(centred, "ArrowRight", false, wideCover)).toEqual({
      x: 49,
      y: 50,
    });
    expect(nudgePosition(centred, "ArrowLeft", false, wideCover)).toEqual({
      x: 51,
      y: 50,
    });
    expect(nudgePosition(centred, "ArrowDown", false, tallCover)).toEqual({
      x: 50,
      y: 49,
    });
  });

  it("moves ten points with Shift", () => {
    expect(nudgePosition(centred, "ArrowUp", true, tallCover)).toEqual({
      x: 50,
      y: 60,
    });
    expect(nudgePosition(centred, "ArrowDown", true, wideContain)).toEqual({
      x: 50,
      y: 60,
    });
  });

  it("leaves an axis with no slack where it is", () => {
    expect(nudgePosition(centred, "ArrowUp", true, wideCover)).toEqual(centred);
  });

  it("clamps at the image edges", () => {
    expect(
      nudgePosition({ x: 5, y: 50 }, "ArrowRight", true, wideCover),
    ).toEqual({ x: 0, y: 50 });
    expect(
      nudgePosition({ x: 95, y: 50 }, "ArrowLeft", true, wideCover),
    ).toEqual({ x: 100, y: 50 });
  });

  it("ignores keys that are not arrows", () => {
    expect(nudgePosition(centred, "Enter", false, wideCover)).toBeNull();
  });
});

// Sizes the crop the way Smartcrop does at its default scale, the largest region of the device's aspect
function deviceCrop(
  analysed: Size,
  device: Device,
  offset: { x: number; y: number },
): Rect {
  const frame = deviceFrames[device];
  const scale = Math.min(
    analysed.width / frame.width,
    analysed.height / frame.height,
  );
  return {
    ...offset,
    width: Math.trunc(frame.width * scale),
    height: Math.trunc(frame.height * scale),
  };
}

const landscape: Size = { width: 512, height: 384 };
const portrait: Size = { width: 384, height: 512 };
const square: Size = { width: 512, height: 512 };

describe("cropPosition", () => {
  it("positions a landscape image for a phone from the crop's left edge", () => {
    // The mobile crop is 177px wide, leaving 335px of horizontal overflow
    const at = (x: number) =>
      cropPosition(deviceCrop(landscape, "mobile", { x, y: 0 }), landscape);
    expect(at(0)).toEqual({ x: 0, y: 50 });
    expect(at(335)).toEqual({ x: 100, y: 50 });
    expect(at(100)).toEqual({ x: 29.9, y: 50 });
  });

  it("positions a portrait image for desktop from the crop's top edge", () => {
    // The desktop crop is 384 x 240, leaving 272px of vertical overflow
    const at = (y: number) =>
      cropPosition(deviceCrop(portrait, "desktop", { x: 0, y }), portrait);
    expect(at(0)).toEqual({ x: 50, y: 0 });
    expect(at(272)).toEqual({ x: 50, y: 100 });
    expect(at(68)).toEqual({ x: 50, y: 25 });
  });

  it("positions a square image for a tablet horizontally", () => {
    // The tablet crop is 355px wide, leaving 157px of horizontal overflow
    const crop = deviceCrop(square, "tablet", { x: 157, y: 0 });
    expect(crop.width).toBe(355);
    expect(cropPosition(crop, square)).toEqual({ x: 100, y: 50 });
  });

  it("centres an image that already has the device's aspect", () => {
    const desktopShaped: Size = { width: 512, height: 320 };
    expect(
      cropPosition(
        deviceCrop(desktopShaped, "desktop", { x: 0, y: 0 }),
        desktopShaped,
      ),
    ).toEqual(centred);
  });

  it("centres an axis with a single pixel of overflow", () => {
    expect(
      cropPosition({ x: 1, y: 0, width: 511, height: 384 }, landscape),
    ).toEqual(centred);
  });

  it("clamps a crop that truncation pushed past the far edge", () => {
    expect(
      cropPosition({ x: 340, y: 0, width: 177, height: 384 }, landscape),
    ).toEqual({ x: 100, y: 50 });
  });

  it("gives the same position at any analysis scale", () => {
    const half: Size = { width: 256, height: 192 };
    expect(
      cropPosition({ x: 134, y: 0, width: 178, height: 384 }, landscape),
    ).toEqual(cropPosition({ x: 67, y: 0, width: 89, height: 192 }, half));
  });
});
