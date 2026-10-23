import type { Device } from "@repo/portal";
import type { Size } from "./background-geometry";

// The canvas frames double as the aspects background recommendations are cropped for
export const deviceFrames: Record<Device, Size> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};
