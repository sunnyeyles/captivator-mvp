import type { CSSProperties } from "react";
import type { PortalConfig } from "../schema";

// Guest field labels have no colour setting, so they follow whichever of dark or light reads on the background
export function readableTextColor(background: string) {
  const hex =
    background.length === 4
      ? [...background.slice(1)].map((digit) => digit + digit).join("")
      : background.slice(1);
  const [red = 0, green = 0, blue = 0] = [0, 2, 4].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
  return luminance > 0.6 ? "#1c1917" : "#ffffff";
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
