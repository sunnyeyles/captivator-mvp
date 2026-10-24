import {
  defaultPortalConfig,
  IMAGE_MAX_BYTES,
  type PortalConfig,
} from "@repo/portal";
import { describe, expect, it, vi } from "vitest";
import {
  assetFileError,
  imageFileError,
  revokeUnreachableImageUrls,
} from "./images";

function withImages(logo: string | null, background: string | null) {
  return {
    ...defaultPortalConfig,
    branding: { logo: logo ? { src: logo, alt: "Logo" } : null },
    background: {
      type: "image",
      color: "#000000",
      image: background
        ? {
            src: background,
            fit: "cover",
            position: { x: 50, y: 50 },
            recommended: null,
            overlay: null,
          }
        : null,
    },
  } satisfies PortalConfig;
}

describe("imageFileError", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s", (type) => {
    expect(imageFileError({ type, size: 2048 })).toBeNull();
  });

  it("rejects an unsupported format with a message", () => {
    expect(imageFileError({ type: "image/gif", size: 2048 })).toBe(
      "Upload a PNG, JPEG or WebP image",
    );
  });

  it("rejects an oversized file with a message", () => {
    expect(imageFileError({ type: "image/png", size: 50 * 1024 * 1024 })).toBe(
      "Upload an image of 5 MB or less",
    );
  });
});

describe("assetFileError", () => {
  it.each(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])(
    "accepts %s",
    (type) => {
      expect(assetFileError({ type, size: 2048 })).toBeNull();
    },
  );

  it.each(["text/plain", "image/gif", ""])(
    "rejects %s as not an image it can use",
    (type) => {
      expect(assetFileError({ type, size: 2048 })).toBe(
        "Upload a PNG, JPEG, WebP or SVG image",
      );
    },
  );

  it("rejects an oversized SVG", () => {
    expect(
      assetFileError({ type: "image/svg+xml", size: IMAGE_MAX_BYTES + 1 }),
    ).toBe("Upload an image of 5 MB or less");
  });
});

describe("revokeUnreachableImageUrls", () => {
  it("revokes a replaced logo", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages("blob:a", null)],
      [withImages("blob:b", null)],
      revoke,
    );

    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:a");
  });

  it("revokes a removed background image", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages(null, "blob:bg")],
      [withImages(null, null)],
      revoke,
    );

    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:bg");
  });

  it("keeps URLs that are still referenced", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages("blob:a", "blob:bg")],
      [{ ...withImages("blob:a", "blob:bg"), texts: [] }],
      revoke,
    );

    expect(revoke).not.toHaveBeenCalled();
  });

  it("keeps a URL that moves between logo and background", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages("blob:a", null)],
      [withImages(null, "blob:a")],
      revoke,
    );

    expect(revoke).not.toHaveBeenCalled();
  });

  it("never revokes URLs it did not create", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages("https://cdn.example.com/logo.png", null)],
      [withImages(null, null)],
      revoke,
    );

    expect(revoke).not.toHaveBeenCalled();
  });

  it("keeps a URL any remaining config still references", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages("blob:a", null), withImages("blob:b", null)],
      [withImages("blob:b", null), withImages("blob:a", "blob:bg")],
      revoke,
    );

    expect(revoke).not.toHaveBeenCalled();
  });

  it("revokes each URL once even when several configs dropped it", () => {
    const revoke = vi.fn();

    revokeUnreachableImageUrls(
      [withImages("blob:a", null), withImages("blob:a", "blob:a")],
      [withImages(null, null)],
      revoke,
    );

    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:a");
  });
});
