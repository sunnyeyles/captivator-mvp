import type { BrandProfile } from "@repo/portal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyseBrandImage } from "./background-analysis";
import { acmeBrand } from "./test-fixtures";

const crop = vi.fn();
vi.mock("smartcrop", () => ({ default: { crop } }));

const brand: BrandProfile = {
  ...acmeBrand,
  image: `data:image/png;base64,${btoa("pixels")}`,
  missing: ["logo", "colors"],
};

const decoded: Blob[] = [];

beforeEach(() => {
  decoded.length = 0;
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async (source: unknown) => {
      if (source instanceof Blob) decoded.push(source);
      return { width: 400, height: 200, close: () => {} };
    }),
  );
  // A crop hugging the right edge, as for a subject on the right of a wide image
  crop.mockImplementation(async (_image, { width, height }) => {
    const cropWidth = (200 * width) / height;
    return {
      topCrop: {
        x: 400 - Math.min(400, cropWidth),
        y: 0,
        width: cropWidth,
        height: 200,
      },
    };
  });
  vi.spyOn(URL, "createObjectURL");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  crop.mockReset();
});

describe("analyseBrandImage", () => {
  it("analyses the data URL image as a Blob and keeps the data URL", async () => {
    const analysed = await analyseBrandImage(brand);

    expect(decoded).toHaveLength(1);
    expect(decoded[0]?.type).toBe("image/png");
    expect(await decoded[0]?.text()).toBe("pixels");
    expect(analysed.image).toBe(brand.image);
    expect(analysed.imageRecommended?.mobile.x).toBe(100);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("falls back to no recommendation when the image can't be decoded", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("Unsupported image");
      }),
    );

    const analysed = await analyseBrandImage(brand);

    expect(analysed.imageRecommended).toBeNull();
    expect(analysed.name).toBe(brand.name);
  });

  it("skips analysis for a brand without an image", async () => {
    const analysed = await analyseBrandImage({ ...brand, image: null });

    expect(analysed.imageRecommended).toBeNull();
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
});
