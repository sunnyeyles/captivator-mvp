import { describe, expect, it } from "vitest";
import { resolveBackgroundImage } from "./background";
import { devices, type BackgroundImage } from "./schema";

const image: BackgroundImage = {
  src: "blob:http://localhost/background",
  fit: "cover",
  position: { x: 10, y: 20 },
  recommended: {
    desktop: { x: 30, y: 40 },
    tablet: { x: 50, y: 60 },
    mobile: { x: 70, y: 80 },
  },
  overlay: null,
};

describe("resolveBackgroundImage", () => {
  it.each(devices)("uses the %s recommendation when covering", (device) => {
    expect(resolveBackgroundImage(image, device).position).toEqual(
      image.recommended?.[device],
    );
  });

  it.each(devices)(
    "prefers a %s override over the recommendation",
    (device) => {
      const overridden: BackgroundImage = {
        ...image,
        overrides: { [device]: { position: { x: 1, y: 2 } } },
      };

      expect(resolveBackgroundImage(overridden, device).position).toEqual({
        x: 1,
        y: 2,
      });
    },
  );

  it("keeps an override to its own device", () => {
    const overridden: BackgroundImage = {
      ...image,
      overrides: { mobile: { position: { x: 1, y: 2 } } },
    };

    expect(resolveBackgroundImage(overridden, "desktop").position).toEqual({
      x: 30,
      y: 40,
    });
    expect(resolveBackgroundImage(overridden, "tablet").position).toEqual({
      x: 50,
      y: 60,
    });
  });

  it.each(devices)(
    "falls back to the shared position on %s without a recommendation",
    (device) => {
      expect(
        resolveBackgroundImage({ ...image, recommended: null }, device)
          .position,
      ).toEqual({ x: 10, y: 20 });
    },
  );

  it.each(devices)(
    "ignores the recommendation on %s when containing",
    (device) => {
      expect(
        resolveBackgroundImage({ ...image, fit: "contain" }, device).position,
      ).toEqual({ x: 10, y: 20 });
    },
  );

  it("still applies an override when containing", () => {
    expect(
      resolveBackgroundImage(
        {
          ...image,
          fit: "contain",
          overrides: { tablet: { position: { x: 0, y: 100 } } },
        },
        "tablet",
      ).position,
    ).toEqual({ x: 0, y: 100 });
  });

  it("keeps the other settings and drops the overrides key", () => {
    const resolved = resolveBackgroundImage(
      { ...image, overrides: { mobile: { position: { x: 1, y: 2 } } } },
      "mobile",
    );

    expect(resolved).toEqual({
      src: image.src,
      fit: "cover",
      position: { x: 1, y: 2 },
      recommended: image.recommended,
      overlay: null,
    });
  });
});
