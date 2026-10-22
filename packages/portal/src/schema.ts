import { z } from "zod";
import { deviceOverridesSchema } from "./overrides";

/** A `#rgb` or `#rrggbb` hex colour, the format the native colour picker reads and writes. */
export const colorSchema = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Enter a hex colour like #1c1917");

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 96;

export const fontWeights = [400, 500, 600, 700] as const;

export const textAligns = ["left", "center", "right"] as const;

const textBaseSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  fontSize: z
    .number()
    .int("Use a whole number")
    .min(FONT_SIZE_MIN, `Use a size from ${FONT_SIZE_MIN} to ${FONT_SIZE_MAX}`)
    .max(FONT_SIZE_MAX, `Use a size from ${FONT_SIZE_MIN} to ${FONT_SIZE_MAX}`),
  color: colorSchema,
  fontWeight: z.union(fontWeights.map((weight) => z.literal(weight))),
  textAlign: z.enum(textAligns),
});

export const textElementSchema = textBaseSchema.extend({
  // Font size and alignment are the text styles that commonly need to differ on a small screen
  overrides: deviceOverridesSchema(
    textBaseSchema.pick({ fontSize: true, textAlign: true }),
  ).optional(),
});

/** Image formats an upload may use, as MIME types. */
export const imageTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** The type and size of an uploaded image file, checked before the editor reads it. */
export const imageFileSchema = z.object({
  type: z.enum(imageTypes, "Upload a PNG, JPEG or WebP image"),
  size: z.number().max(IMAGE_MAX_BYTES, "Upload an image of 5 MB or less"),
});

// A browser object URL while editing, a hosted URL once published
const imageSrcSchema = z.string().min(1);

export const logoSchema = z.object({
  src: imageSrcSchema,
  alt: z.string(),
});

export const brandingSchema = z.object({
  logo: logoSchema.nullable(),
});

export const backgroundFits = ["cover", "contain"] as const;

export const backgroundPositions = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
] as const;

export const overlaySchema = z.object({
  color: colorSchema,
  opacity: z.number().min(0).max(1),
});

export const backgroundImageSchema = z.object({
  src: imageSrcSchema,
  fit: z.enum(backgroundFits),
  position: z.enum(backgroundPositions),
  overlay: overlaySchema.nullable(),
});

// The colour is kept in image mode so switching back restores it and it fills any area the image leaves
export const backgroundSchema = z.object({
  type: z.enum(["color", "image"]),
  color: colorSchema,
  image: backgroundImageSchema.nullable(),
});

export const MAX_GUEST_FIELDS = 2;

export const guestFieldTypes = ["name", "email", "phone"] as const;

export const GUEST_FIELD_LABEL_MAX = 40;
export const GUEST_FIELD_PLACEHOLDER_MAX = 60;

export const guestFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(guestFieldTypes),
  label: z
    .string()
    .max(
      GUEST_FIELD_LABEL_MAX,
      `Use at most ${GUEST_FIELD_LABEL_MAX} characters`,
    )
    .optional(),
  placeholder: z
    .string()
    .max(
      GUEST_FIELD_PLACEHOLDER_MAX,
      `Use at most ${GUEST_FIELD_PLACEHOLDER_MAX} characters`,
    )
    .optional(),
  required: z.boolean().optional(),
});

export const BUTTON_LABEL_MAX = 30;
export const BUTTON_RADIUS_MIN = 0;
export const BUTTON_RADIUS_MAX = 32;
export const BUTTON_WIDTH_MIN = 25;
export const BUTTON_WIDTH_MAX = 100;

export const buttonSchema = z.object({
  label: z
    .string()
    .max(BUTTON_LABEL_MAX, `Use at most ${BUTTON_LABEL_MAX} characters`)
    .refine((label) => label.trim().length > 0, "Enter a button label"),
  backgroundColor: colorSchema,
  textColor: colorSchema,
  borderRadius: z
    .number()
    .int("Use a whole number")
    .min(
      BUTTON_RADIUS_MIN,
      `Use a radius from ${BUTTON_RADIUS_MIN} to ${BUTTON_RADIUS_MAX}`,
    )
    .max(
      BUTTON_RADIUS_MAX,
      `Use a radius from ${BUTTON_RADIUS_MIN} to ${BUTTON_RADIUS_MAX}`,
    ),
  // A percentage of the form column, so one value suits both device widths
  width: z
    .number()
    .int("Use a whole number")
    .min(
      BUTTON_WIDTH_MIN,
      `Use a width from ${BUTTON_WIDTH_MIN} to ${BUTTON_WIDTH_MAX}`,
    )
    .max(
      BUTTON_WIDTH_MAX,
      `Use a width from ${BUTTON_WIDTH_MIN} to ${BUTTON_WIDTH_MAX}`,
    ),
});

/** The full splash page design shared by every device and template. */
export const portalConfigSchema = z.object({
  texts: z
    .array(textElementSchema)
    .refine(
      (texts) => new Set(texts.map((text) => text.id)).size === texts.length,
      "Text ids must be unique",
    ),
  background: backgroundSchema,
  fields: z
    .array(guestFieldSchema)
    .max(MAX_GUEST_FIELDS, `Use at most ${MAX_GUEST_FIELDS} guest fields`)
    .refine(
      (fields) =>
        new Set(fields.map((field) => field.id)).size === fields.length,
      "Guest field ids must be unique",
    )
    .refine(
      (fields) =>
        new Set(fields.map((field) => field.type)).size === fields.length,
      "Each guest field type can be used once",
    ),
  button: buttonSchema,
  branding: brandingSchema,
});

export type PortalConfig = z.infer<typeof portalConfigSchema>;

export type TextElement = z.infer<typeof textElementSchema>;

export type GuestField = z.infer<typeof guestFieldSchema>;

export type GuestFieldType = GuestField["type"];

export type ConnectButton = z.infer<typeof buttonSchema>;

export type Logo = z.infer<typeof logoSchema>;

export type BackgroundImage = z.infer<typeof backgroundImageSchema>;

export type Device = "desktop" | "mobile";

export type RenderMode = "edit" | "preview" | "published";
