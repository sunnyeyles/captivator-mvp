import { imageFileSchema, type PortalConfig } from "@repo/portal";

export function imageFileError(file: Pick<File, "type" | "size">) {
  const result = imageFileSchema.safeParse({
    type: file.type,
    size: file.size,
  });
  return result.error?.issues[0]?.message ?? null;
}

function objectUrlsIn(configs: PortalConfig[]) {
  const urls = new Set<string>();
  for (const config of configs) {
    for (const src of [
      config.branding.logo?.src,
      config.background.image?.src,
    ]) {
      if (src?.startsWith("blob:")) urls.add(src);
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
