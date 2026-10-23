import { z } from "zod";
import type { Device } from "./schema";

/** Builds an element's optional per-device overrides, each validated like the shared style it replaces. */
export function deviceOverridesSchema<Style extends z.ZodObject>(style: Style) {
  // Strict so a device can only override the style keys an element opts in to
  const override = style.partial().strict();
  return z.object({
    desktop: override.optional(),
    tablet: override.optional(),
    mobile: override.optional(),
  });
}

type Overridable = { overrides?: Partial<Record<Device, object>> };

// An element with nothing overridden carries no overrides key, matching one that never had any
function withOverrides<Element extends Overridable>(
  element: Element,
  overrides: Partial<Record<string, object>>,
): Element {
  const result: Overridable = { ...element };
  if (Object.keys(overrides).length > 0) result.overrides = overrides;
  else delete result.overrides;
  return result as Element;
}

/** The style values an element can override for one device. */
export type StyleOverride<Element extends Overridable> = NonNullable<
  NonNullable<Element["overrides"]>[Device]
>;

/** Resolves an element for one device, using its override where one is set and the shared value otherwise. */
export function resolveForDevice<Element extends Overridable>(
  element: Element,
  device: Device,
): Omit<Element, "overrides"> {
  const { overrides, ...shared } = element;
  const override = Object.entries(overrides?.[device] ?? {}).filter(
    ([, value]) => value !== undefined,
  );
  return { ...shared, ...Object.fromEntries(override) };
}

/** Returns the element with the given style values overridden for one device. */
export function setDeviceOverride<Element extends Overridable>(
  element: Element,
  device: Device,
  changes: StyleOverride<Element>,
): Element {
  return {
    ...element,
    overrides: {
      ...element.overrides,
      [device]: { ...element.overrides?.[device], ...changes },
    },
  };
}

/** Returns the element with one style key's device override removed, so it falls back to the shared value. */
export function clearDeviceOverride<Element extends Overridable>(
  element: Element,
  device: Device,
  key: keyof StyleOverride<Element>,
): Element {
  const remaining: Record<PropertyKey, unknown> = {
    ...element.overrides?.[device],
  };
  delete remaining[key];
  const overrides: Partial<Record<Device, object>> = { ...element.overrides };
  if (Object.keys(remaining).length > 0) overrides[device] = remaining;
  else delete overrides[device];
  return withOverrides(element, overrides);
}

/** Returns the element with the given keys' overrides removed on every device, so the shared value applies everywhere. */
export function clearOverridesFor<Element extends Overridable>(
  element: Element,
  keys: readonly string[],
): Element {
  const overrides: Partial<Record<string, object>> = {};
  for (const [device, override] of Object.entries(element.overrides ?? {})) {
    const remaining = Object.entries(override ?? {}).filter(
      ([key]) => !keys.includes(key),
    );
    if (remaining.length > 0) overrides[device] = Object.fromEntries(remaining);
  }
  return withOverrides(element, overrides);
}
