import { resolveForDevice } from "./overrides";
import type { BackgroundImage, Device } from "./schema";

/** Resolves a background image for one device, positioned by its override, then its recommendation when covering, then the shared position. */
export function resolveBackgroundImage(
  image: BackgroundImage,
  device: Device,
): Omit<BackgroundImage, "overrides"> {
  // With contain the whole image shows, so a cover-based recommendation would only push it off centre
  const recommended =
    image.fit === "cover" ? image.recommended?.[device] : undefined;
  return resolveForDevice(
    { ...image, position: recommended ?? image.position },
    device,
  );
}
