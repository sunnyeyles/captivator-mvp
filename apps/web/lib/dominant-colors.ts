const SAMPLE_SIDE = 64;
const OPAQUE_ALPHA = 128;
// Squared RGB distance under which two colours read as the same swatch
const MIN_DISTANCE_SQUARED = 48 * 48;

function toHex(channels: number[]) {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function distanceSquared(a: number[], b: number[]) {
  return a.reduce((sum, channel, index) => sum + (channel - b[index]!) ** 2, 0);
}

/** The most common distinct colours in RGBA pixel data, as hex, largest area first. */
export function dominantColors(pixels: Uint8ClampedArray, max = 6): string[] {
  const buckets = new Map<number, { count: number; sum: number[] }>();
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    if (pixels[offset + 3]! < OPAQUE_ALPHA) continue;
    const rgb = [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!];
    // Four bits per channel groups shades of one colour that compression or anti-aliasing split
    const key = ((rgb[0]! >> 4) << 8) | ((rgb[1]! >> 4) << 4) | (rgb[2]! >> 4);
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bucket.count += 1;
    rgb.forEach((channel, index) => (bucket.sum[index]! += channel));
    buckets.set(key, bucket);
  }
  const picked: number[][] = [];
  for (const { count, sum } of [...buckets.values()].sort(
    (a, b) => b.count - a.count,
  )) {
    if (picked.length >= max) break;
    const average = sum.map((channel) => Math.round(channel / count));
    if (
      picked.every(
        (color) => distanceSquared(color, average) >= MIN_DISTANCE_SQUARED,
      )
    ) {
      picked.push(average);
    }
  }
  return picked.map(toHex);
}

/** Reads an image's dominant colours in the browser, or none when it can't be drawn. */
export async function imageColors(src: string, max = 6): Promise<string[]> {
  try {
    // An <img> rather than createImageBitmap, since only an element decodes SVG everywhere
    const image = new Image();
    image.src = src;
    await image.decode();
    const scale = Math.min(
      1,
      SAMPLE_SIDE / Math.max(image.naturalWidth || 1, image.naturalHeight || 1),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(
      1,
      Math.round((image.naturalWidth || SAMPLE_SIDE) * scale),
    );
    canvas.height = Math.max(
      1,
      Math.round((image.naturalHeight || SAMPLE_SIDE) * scale),
    );
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return dominantColors(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      max,
    );
  } catch {
    return [];
  }
}
