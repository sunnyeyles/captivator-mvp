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

export const SPACE_ABOVE_MIN = 0;
export const SPACE_ABOVE_MAX = 96;

// Extra space between an element and the one before it, on top of the device layout's gap
const spaceAboveSchema = z
  .number()
  .int("Use a whole number")
  .min(
    SPACE_ABOVE_MIN,
    `Use a spacing from ${SPACE_ABOVE_MIN} to ${SPACE_ABOVE_MAX}`,
  )
  .max(
    SPACE_ABOVE_MAX,
    `Use a spacing from ${SPACE_ABOVE_MIN} to ${SPACE_ABOVE_MAX}`,
  );

export const ELEMENT_WIDTH_MIN = 25;
export const ELEMENT_WIDTH_MAX = 100;

// A percentage of the form column, so one value suits every device width
const elementWidthSchema = z
  .number()
  .int("Use a whole number")
  .min(
    ELEMENT_WIDTH_MIN,
    `Use a width from ${ELEMENT_WIDTH_MIN} to ${ELEMENT_WIDTH_MAX}`,
  )
  .max(
    ELEMENT_WIDTH_MAX,
    `Use a width from ${ELEMENT_WIDTH_MIN} to ${ELEMENT_WIDTH_MAX}`,
  );

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
  spaceAbove: spaceAboveSchema.optional(),
});

export const textElementSchema = textBaseSchema.extend({
  // Size, alignment and spacing are the text styles that commonly need to differ on a small screen
  overrides: deviceOverridesSchema(
    textBaseSchema.pick({ fontSize: true, textAlign: true, spaceAbove: true }),
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

export const LOGO_MAX_HEIGHT_MIN = 24;
export const LOGO_MAX_HEIGHT_MAX = 200;

const logoBaseSchema = z.object({
  src: imageSrcSchema,
  alt: z.string(),
  maxHeight: z
    .number()
    .int("Use a whole number")
    .min(
      LOGO_MAX_HEIGHT_MIN,
      `Use a height from ${LOGO_MAX_HEIGHT_MIN} to ${LOGO_MAX_HEIGHT_MAX}`,
    )
    .max(
      LOGO_MAX_HEIGHT_MAX,
      `Use a height from ${LOGO_MAX_HEIGHT_MIN} to ${LOGO_MAX_HEIGHT_MAX}`,
    )
    .optional(),
  spaceAbove: spaceAboveSchema.optional(),
});

export const logoSchema = logoBaseSchema.extend({
  overrides: deviceOverridesSchema(
    logoBaseSchema.pick({ maxHeight: true, spaceAbove: true }),
  ).optional(),
});

export const brandingSchema = z.object({
  logo: logoSchema.nullable(),
});

export const backgroundFits = ["cover", "contain"] as const;

export const BACKGROUND_POSITION_MIN = 0;
export const BACKGROUND_POSITION_MAX = 100;

const positionPercentSchema = z
  .number()
  .min(
    BACKGROUND_POSITION_MIN,
    `Use a position from ${BACKGROUND_POSITION_MIN} to ${BACKGROUND_POSITION_MAX}`,
  )
  .max(
    BACKGROUND_POSITION_MAX,
    `Use a position from ${BACKGROUND_POSITION_MIN} to ${BACKGROUND_POSITION_MAX}`,
  );

/** A background image position as CSS `object-position` percentages, where 50/50 is centred. */
export const backgroundPositionSchema = z.object({
  x: positionPercentSchema,
  y: positionPercentSchema,
});

/** The automatic background image position worked out for each device. */
export const backgroundPositionRecommendationSchema = z.object({
  desktop: backgroundPositionSchema,
  tablet: backgroundPositionSchema,
  mobile: backgroundPositionSchema,
});

export const overlaySchema = z.object({
  color: colorSchema,
  opacity: z.number().min(0).max(1),
});

const backgroundImageBaseSchema = z.object({
  src: imageSrcSchema,
  fit: z.enum(backgroundFits),
  // The final fallback, used when a device has neither an override nor a recommendation
  position: backgroundPositionSchema,
  // Null when the image was never analysed, such as a template's bundled image
  recommended: backgroundPositionRecommendationSchema.nullable(),
  overlay: overlaySchema.nullable(),
});

export const backgroundImageSchema = backgroundImageBaseSchema.extend({
  overrides: deviceOverridesSchema(
    backgroundImageBaseSchema.pick({ position: true }),
  ).optional(),
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

const guestFieldBaseSchema = z.object({
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
  width: elementWidthSchema.optional(),
  spaceAbove: spaceAboveSchema.optional(),
});

export const guestFieldSchema = guestFieldBaseSchema.extend({
  overrides: deviceOverridesSchema(
    guestFieldBaseSchema.pick({ width: true, spaceAbove: true }),
  ).optional(),
});

export const BUTTON_LABEL_MAX = 30;
export const BUTTON_RADIUS_MIN = 0;
export const BUTTON_RADIUS_MAX = 32;
const buttonBaseSchema = z.object({
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
  width: elementWidthSchema,
  spaceAbove: spaceAboveSchema.optional(),
});

export const buttonSchema = buttonBaseSchema.extend({
  overrides: deviceOverridesSchema(
    buttonBaseSchema.pick({ width: true, spaceAbove: true }),
  ).optional(),
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

export type BackgroundPosition = z.infer<typeof backgroundPositionSchema>;

export type BackgroundPositionRecommendation = z.infer<
  typeof backgroundPositionRecommendationSchema
>;

/** The devices a splash page is designed and previewed for, largest first. */
export const devices = ["desktop", "tablet", "mobile"] as const;

export type Device = (typeof devices)[number];

export type RenderMode = "edit" | "preview" | "published";
