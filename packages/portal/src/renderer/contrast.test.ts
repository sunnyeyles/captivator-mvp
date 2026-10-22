import { describe, expect, it } from "vitest";
import type { PortalConfig } from "../schema";
import { guestLabelStyle, readableTextColor } from "./contrast";

describe("readableTextColor", () => {
  it.each(["#ffffff", "#fff", "#f5f5f4", "#fde047"])(
    "uses dark text on %s",
    (background) => {
      expect(readableTextColor(background)).toBe("#1c1917");
    },
  );

  it.each(["#000000", "#000", "#1c1917", "#1d4ed8"])(
    "uses light text on %s",
    (background) => {
      expect(readableTextColor(background)).toBe("#ffffff");
    },
  );
});

describe("guestLabelStyle", () => {
  const image = {
    src: "blob:http://localhost/background",
    fit: "cover",
    position: "center",
    overlay: null,
  } as const;

  function imageBackground(
    overlay: { color: string; opacity: number } | null,
  ): PortalConfig["background"] {
    // A white fallback colour would wrongly ask for dark labels if it were used
    return { type: "image", color: "#ffffff", image: { ...image, overlay } };
  }

  it("follows the background colour in colour mode", () => {
    expect(
      guestLabelStyle({ type: "color", color: "#ffffff", image: null }),
    ).toEqual({ color: "#1c1917" });
  });

  it("follows the colour when image mode has no image", () => {
    expect(
      guestLabelStyle({ type: "image", color: "#000000", image: null }),
    ).toEqual({ color: "#ffffff" });
  });

  it("ignores a kept image while in colour mode", () => {
    expect(
      guestLabelStyle({ type: "color", color: "#ffffff", image }),
    ).toEqual({ color: "#1c1917" });
  });

  it("follows a strong overlay over an image", () => {
    expect(
      guestLabelStyle(imageBackground({ color: "#000000", opacity: 0.6 })),
    ).toEqual({ color: "#ffffff" });
    expect(
      guestLabelStyle(imageBackground({ color: "#ffffff", opacity: 0.5 })),
    ).toEqual({ color: "#1c1917" });
  });

  it.each([
    ["no overlay", null],
    ["a faint overlay", { color: "#ffffff", opacity: 0.2 }],
  ])(
    "uses shadowed light labels on an image with %s",
    (_name, overlay) => {
      const style = guestLabelStyle(imageBackground(overlay));

      expect(style.color).toBe("#ffffff");
      expect(style.textShadow).toBeTruthy();
    },
  );
});
