import {
  defaultBackgroundImageSettings,
  imageFileSchema,
  imageTypes,
  type BackgroundImage,
  type BackgroundPositionRecommendation,
  type PortalConfig,
} from "@repo/portal";
import { z } from "zod";

export function imageFileError(file: Pick<File, "type" | "size">) {
  const result = imageFileSchema.safeParse({
    type: file.type,
    size: file.size,
  });
  return result.error?.issues[0]?.message ?? null;
}

export const SVG_TYPE = "image/svg+xml";

/** Formats the design assistant takes as brand assets, where SVG may only be a logo. */
export const assetImageTypes = [...imageTypes, SVG_TYPE] as const;

const assetFileSchema = imageFileSchema.extend({
  type: z.enum(assetImageTypes, "Upload a PNG, JPEG, WebP or SVG image"),
});

export function assetFileError(file: Pick<File, "type" | "size">) {
  const result = assetFileSchema.safeParse({
    type: file.type,
    size: file.size,
  });
  return result.error?.issues[0]?.message ?? null;
}

/** A new background image that keeps the fit and overlay of the one it replaces. */
export function placedBackgroundImage(
  previous: BackgroundImage | null,
  src: string,
  recommended: BackgroundPositionRecommendation | null,
): BackgroundImage {
  const settings = previous ?? defaultBackgroundImageSettings;
  return {
    ...defaultBackgroundImageSettings,
    fit: settings.fit,
    overlay: settings.overlay,
    src,
    recommended,
  };
}

export function isObjectUrl(src: string) {
  return src.startsWith("blob:");
}

// Image slots are listed here and in imageSrcs below, so a new slot needs adding to both
export async function mapImageSrcs(
  config: PortalConfig,
  map: (src: string) => string | Promise<string>,
): Promise<PortalConfig> {
  const { logo } = config.branding;
  const { image } = config.background;
  return {
    ...config,
    branding: {
      ...config.branding,
      logo: logo && { ...logo, src: await map(logo.src) },
    },
    background: {
      ...config.background,
      image: image && { ...image, src: await map(image.src) },
    },
  };
}

function imageSrcs(config: PortalConfig) {
  return [config.branding.logo?.src, config.background.image?.src];
}

function objectUrlsIn(configs: PortalConfig[]) {
  const urls = new Set<string>();
  for (const config of configs) {
    for (const src of imageSrcs(config)) {
      if (src && isObjectUrl(src)) urls.add(src);
    }
  }
  return urls;
}

// Diffing whole configs catches every way an image leaves, including ones added after this ticket
export function revokeUnreachableImageUrls(
  previous: PortalConfig[],
  next: PortalConfig[],
  revoke: (url: string) => void = (url) => URL.revokeObjectURL(url),
) {
  const kept = objectUrlsIn(next);
  for (const url of objectUrlsIn(previous)) {
    if (!kept.has(url)) revoke(url);
  }
}
