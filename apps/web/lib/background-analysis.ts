import type {
  BackgroundPosition,
  BackgroundPositionRecommendation,
  BrandProfile,
  Device,
} from "@repo/portal";
import { cropPosition, type Size } from "./background-geometry";
import { deviceFrames } from "./device-frames";

const ANALYSIS_LONGEST_SIDE = 512;
const ANALYSIS_TIMEOUT_MS = 2000;

// Smartcrop draws whatever it gets onto a canvas, so a full-resolution photo would cost tens of megabytes of pixels
async function decodeForAnalysis(image: Blob) {
  const full = await createImageBitmap(image);
  try {
    const scale = Math.min(
      1,
      ANALYSIS_LONGEST_SIDE / Math.max(full.width, full.height),
    );
    return await createImageBitmap(full, {
      resizeWidth: Math.max(1, Math.round(full.width * scale)),
      resizeHeight: Math.max(1, Math.round(full.height * scale)),
      resizeQuality: "medium",
    });
  } finally {
    full.close();
  }
}

// Each crop would otherwise chain through microtasks into one long main-thread task
function yieldToMain() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function recommend(
  image: Blob,
): Promise<BackgroundPositionRecommendation | null> {
  const [library, decoded] = await Promise.allSettled([
    import("smartcrop"),
    decodeForAnalysis(image),
  ]);
  if (decoded.status === "rejected") return null;
  const bitmap = decoded.value;
  try {
    if (library.status === "rejected") return null;
    const smartcrop = library.value.default;
    const analysed: Size = { width: bitmap.width, height: bitmap.height };
    const positionFor = async (device: Device): Promise<BackgroundPosition> => {
      await yieldToMain();
      const { topCrop } = await smartcrop.crop(bitmap, deviceFrames[device]);
      return cropPosition(topCrop, analysed);
    };
    const desktop = await positionFor("desktop");
    const tablet = await positionFor("tablet");
    const mobile = await positionFor("mobile");
    return { desktop, tablet, mobile };
  } finally {
    bitmap.close();
  }
}

// Gives up after 2 seconds and returns null, so a slow or broken image never blocks the upload
async function analyseBackgroundImage(
  image: Blob,
): Promise<BackgroundPositionRecommendation | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ANALYSIS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([recommend(image), timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Starts downloading the analysis library early so it overlaps a wait that comes before the analysis. */
export function preloadBackgroundAnalysis() {
  // The analysis itself reports a failed load, so an early failure here needs no handling
  import("smartcrop").catch(() => {});
}

/** Analyses an image and wraps it in a new object URL, ready for placing as the background. */
export async function prepareBackgroundImage(image: Blob): Promise<{
  src: string;
  recommended: BackgroundPositionRecommendation | null;
}> {
  const recommended = await analyseBackgroundImage(image);
  return { src: URL.createObjectURL(image), recommended };
}

/** Adds an imported brand's background recommendation, analysed from its data URL image, or null when it can't be analysed. */
export async function analyseBrandImage(
  brand: BrandProfile,
): Promise<BrandProfile> {
  if (!brand.image) return { ...brand, imageRecommended: null };
  try {
    // Fetching a data URL decodes it locally, so the image never needs an object URL
    const image = await (await fetch(brand.image)).blob();
    return { ...brand, imageRecommended: await analyseBackgroundImage(image) };
  } catch {
    return { ...brand, imageRecommended: null };
  }
}
