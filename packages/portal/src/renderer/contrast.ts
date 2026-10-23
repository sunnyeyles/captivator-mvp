import type { CSSProperties } from "react";
import type { PortalConfig } from "../schema";

function channels(color: string) {
  const hex =
    color.length === 4
      ? [...color.slice(1)].map((digit) => digit + digit).join("")
      : color.slice(1);
  return [0, 2, 4].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  );
}

// Guest field labels have no colour setting, so they follow whichever of dark or light reads on the background
export function readableTextColor(background: string) {
  const [red = 0, green = 0, blue = 0] = channels(background);
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
  return luminance > 0.6 ? "#1c1917" : "#ffffff";
}

function relativeLuminance(color: string) {
  const [red = 0, green = 0, blue = 0] = channels(color).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The WCAG 2 contrast ratio between two hex colours, from 1 to 21. */
export function contrastRatio(first: string, second: string) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// From this opacity the overlay, not the image under it, sets how the labels read
const OVERLAY_DOMINANT_OPACITY = 0.5;

export function guestLabelStyle(
  background: PortalConfig["background"],
): CSSProperties {
  const image = background.type === "image" ? background.image : null;
  if (!image) return { color: readableTextColor(background.color) };
  const { overlay } = image;
  if (overlay && overlay.opacity >= OVERLAY_DOMINANT_OPACITY) {
    return { color: readableTextColor(overlay.color) };
  }
  // The image's colours are unknown, and the fallback colour is hidden behind it, so the shadow keeps labels legible on any image
  return { color: "#ffffff", textShadow: "0 1px 3px rgb(0 0 0 / 0.8)" };
}
