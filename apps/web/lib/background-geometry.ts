import {
  BACKGROUND_POSITION_MAX,
  BACKGROUND_POSITION_MIN,
  type BackgroundImage,
  type BackgroundPosition,
} from "@repo/portal";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface BackgroundGeometry {
  frame: Size;
  natural: Size;
  fit: BackgroundImage["fit"];
}

export const NUDGE_STEP = 1;
export const LARGE_NUDGE_STEP = 10;

// Below half a page pixel of slack an axis has nothing to move, and float noise would make it jump
const MIN_SLACK = 0.5;

function clampPosition(value: number) {
  const clamped = Math.min(
    BACKGROUND_POSITION_MAX,
    Math.max(BACKGROUND_POSITION_MIN, value),
  );
  return Math.round(clamped * 10) / 10;
}

// Frame minus rendered image size per axis, negative where cover crops and positive where contain letterboxes
function slack({ frame, natural, fit }: BackgroundGeometry) {
  const ratios = [frame.width / natural.width, frame.height / natural.height];
  const scale = fit === "cover" ? Math.max(...ratios) : Math.min(...ratios);
  return {
    x: frame.width - natural.width * scale,
    y: frame.height - natural.height * scale,
  };
}

function moveAxis(position: number, pagePixels: number, axisSlack: number) {
  if (Math.abs(axisSlack) < MIN_SLACK) return position;
  return clampPosition(position + (pagePixels / axisSlack) * 100);
}

/** The position that moves the image by a pointer delta in screen pixels, measured from where the drag began. */
export function dragPosition(
  start: BackgroundPosition,
  delta: { x: number; y: number },
  canvasScale: number,
  geometry: BackgroundGeometry,
): BackgroundPosition {
  const { x, y } = slack(geometry);
  return {
    x: moveAxis(start.x, delta.x / canvasScale, x),
    y: moveAxis(start.y, delta.y / canvasScale, y),
  };
}

const arrowDirections: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/** The position after an arrow key press, which moves the image the way the arrow points, or null for any other key. */
export function nudgePosition(
  position: BackgroundPosition,
  key: string,
  large: boolean,
  geometry: BackgroundGeometry,
): BackgroundPosition | null {
  const direction = arrowDirections[key];
  if (!direction) return null;
  const step = large ? LARGE_NUDGE_STEP : NUDGE_STEP;
  const { x, y } = slack(geometry);
  // Moving the image right lowers the position under cover, so the step follows the slack's sign
  const nudge = (value: number, sign: number, axisSlack: number) =>
    Math.abs(axisSlack) < MIN_SLACK
      ? value
      : clampPosition(value + sign * step * Math.sign(axisSlack));
  return {
    x: nudge(position.x, direction.x, x),
    y: nudge(position.y, direction.y, y),
  };
}

function cropAxis(offset: number, cropped: number, analysed: number) {
  const overflow = analysed - cropped;
  // Without overflow the axis can't move, so centred is the only stable value
  if (overflow <= 1) return 50;
  return clampPosition((offset / overflow) * 100);
}

/** The cover position that shows a crop of an image, with the crop measured in the analysed image's pixels. */
export function cropPosition(crop: Rect, analysed: Size): BackgroundPosition {
  return {
    x: cropAxis(crop.x, crop.width, analysed.width),
    y: cropAxis(crop.y, crop.height, analysed.height),
  };
}
