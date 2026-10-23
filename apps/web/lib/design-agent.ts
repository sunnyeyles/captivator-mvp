import {
  backgroundSchema,
  BRAND_COLORS_MAX,
  BRAND_DESCRIPTION_MAX,
  BRAND_NAME_MAX,
  buttonSchema,
  clearOverridesFor,
  colorSchema,
  defaultTextStyle,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  guestFieldSchema,
  guestFieldTypes,
  MAX_GUEST_FIELDS,
  portalConfigSchema,
  textAligns,
  textElementSchema,
  type BackgroundPositionRecommendation,
  type GuestField,
  type PortalConfig,
  type TextElement,
} from "@repo/portal";
import type { DeepPartial } from "ai";
import { z } from "zod";
import { placedBackgroundImage } from "./images";

// Loose types with descriptions so every gateway model accepts the schema, while the merge enforces the real limits
const hex = z.string().describe("Hex colour like #1c1917");

const generatedTextSchema = z.object({
  id: z
    .string()
    .describe(
      "Keep an existing text's id when editing it, or use a new kebab-case id",
    ),
  text: z.string(),
  fontSize: z.number().describe(`Pixels, ${FONT_SIZE_MIN} to ${FONT_SIZE_MAX}`),
  color: hex,
  fontWeight: z.number().describe("One of 400, 500, 600, 700"),
  textAlign: z.enum(textAligns),
});

/** The part of a splash page design the agent writes, top to bottom as guests see it. */
export const generatedDesignSchema = z.object({
  texts: z.array(generatedTextSchema).describe("Headings and copy, in order"),
  background: z.object({
    type: z
      .enum(["color", "image"])
      .describe("Use image only when the page has a background image"),
    color: hex,
  }),
  fields: z
    .array(
      z.object({
        type: z.enum(guestFieldTypes),
        label: z.string().describe("At most 40 characters"),
        placeholder: z.string().describe("At most 60 characters"),
        required: z.boolean(),
      }),
    )
    .describe(`At most ${MAX_GUEST_FIELDS}, each type used once`),
  button: z.object({
    label: z.string().describe("At most 30 characters"),
    backgroundColor: hex,
    textColor: hex,
    borderRadius: z.number().describe("Pixels, 0 to 32"),
    width: z.number().describe("Percent of the form width, 25 to 100"),
  }),
});

// Design first so the canvas starts changing before the summary streams
export const designReplySchema = z.object({
  design: generatedDesignSchema,
  reply: z
    .string()
    .describe(
      "One or two friendly sentences telling the customer what changed",
    ),
});

export type GeneratedDesign = z.infer<typeof generatedDesignSchema>;

export const CHAT_MESSAGE_MAX = 1000;
export const CHAT_HISTORY_MAX = 20;

/** Brand details the customer supplied, from their website or uploaded images, for the agent to theme around. */
export const brandContextSchema = z.object({
  name: z.string().trim().min(1).max(BRAND_NAME_MAX).optional(),
  description: z.string().trim().min(1).max(BRAND_DESCRIPTION_MAX).optional(),
  sourceUrl: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional(),
  colors: z.array(colorSchema).max(BRAND_COLORS_MAX),
  hasLogo: z.boolean(),
});

export type BrandContext = z.infer<typeof brandContextSchema>;

export const designRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(CHAT_MESSAGE_MAX),
      }),
    )
    .min(1)
    .max(CHAT_HISTORY_MAX),
  design: generatedDesignSchema,
  hasBackgroundImage: z.boolean(),
  brand: brandContextSchema.optional(),
});

export type DesignRequest = z.infer<typeof designRequestSchema>;
export type ChatMessage = DesignRequest["messages"][number];

export const examplePrompts = [
  {
    title: "Music festival",
    prompt:
      "Bold splash page for a summer music festival. Neon pink and purple on black, energetic headline, ask for email only.",
  },
  {
    title: "Weekend market",
    prompt:
      "Friendly page for a weekend farmers' market. Earthy greens and cream, warm welcome text, collect name and email for the stallholder newsletter.",
  },
  {
    title: "Footy grand final",
    prompt:
      "Splash page for a regional footy grand final. Navy and gold team colours, big 'Game day Wi-Fi' heading, ask for name and phone.",
  },
  {
    title: "Tech conference",
    prompt:
      "Clean, professional page for a two-day tech conference. White and slate with a blue Connect button, collect full name and work email.",
  },
  {
    title: "Charity fun run",
    prompt:
      "Bright, upbeat page for a charity fun run. Orange and white, thank guests for supporting the cause, collect email.",
  },
  {
    title: "Rooftop pop-up bar",
    prompt:
      "Moody page for a rooftop pop-up bar. Dark charcoal with gold accents, short playful tagline, ask for email only.",
  },
] as const;

/** Images the customer brought for the agent to design around. */
export interface DesignAssets {
  logo?: string;
  background?: {
    src: string;
    recommended: BackgroundPositionRecommendation | null;
  };
}

/** A chat turn that starts a design from the customer's own brand. */
export interface DesignStart {
  text: string;
  brand?: BrandContext;
  assets?: DesignAssets;
}

/** Places a customer's logo and background image on a config, so the agent's reply lands on top of them. */
export function withAssets(
  config: PortalConfig,
  { logo, background }: DesignAssets = {},
): PortalConfig {
  const current = config.branding.logo;
  return {
    ...config,
    branding: logo
      ? {
          ...config.branding,
          logo: { ...current, src: logo, alt: current?.alt ?? "Logo" },
        }
      : config.branding,
    background: background
      ? {
          ...config.background,
          type: "image",
          image: placedBackgroundImage(
            config.background.image,
            background.src,
            background.recommended,
          ),
        }
      : config.background,
  };
}

/** The agent's view of a config, without image sources, ids it can't use or device overrides. */
export function toGeneratedDesign(config: PortalConfig): GeneratedDesign {
  return {
    texts: config.texts.map(
      ({ id, text, fontSize, color, fontWeight, textAlign }) => ({
        id,
        text,
        fontSize,
        color,
        fontWeight,
        textAlign,
      }),
    ),
    background: {
      type: config.background.type,
      color: config.background.color,
    },
    fields: config.fields.map(({ type, label, placeholder, required }) => ({
      type,
      label: label ?? "",
      placeholder: placeholder ?? "",
      required: required ?? false,
    })),
    button: {
      label: config.button.label,
      backgroundColor: config.button.backgroundColor,
      textColor: config.button.textColor,
      borderRadius: config.button.borderRadius,
      width: config.button.width,
    },
  };
}

function validOr<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

// Keys the agent set to a new value, whose device overrides would otherwise hide the change
function changedKeys(before: object, after: object) {
  const previous: Record<string, unknown> = { ...before };
  return Object.entries(after)
    .filter(([key, value]) => previous[key] !== value)
    .map(([key]) => key);
}

function mergeText(
  base: PortalConfig,
  partial: DeepPartial<GeneratedDesign["texts"][number]> | undefined,
): TextElement | null {
  if (!partial?.id) return null;
  const current = base.texts.find((text) => text.id === partial.id) ?? {
    id: partial.id,
    text: "",
    ...defaultTextStyle,
  };
  const { shape } = textElementSchema;
  const merged: TextElement = {
    ...current,
    text: partial.text ?? current.text,
    fontSize: validOr(shape.fontSize, partial.fontSize, current.fontSize),
    color: validOr(shape.color, partial.color, current.color),
    fontWeight: validOr(
      shape.fontWeight,
      partial.fontWeight,
      current.fontWeight,
    ),
    textAlign: validOr(shape.textAlign, partial.textAlign, current.textAlign),
  };
  return clearOverridesFor(merged, changedKeys(current, merged));
}

function mergeField(
  base: PortalConfig,
  partial: DeepPartial<GeneratedDesign["fields"][number]> | undefined,
): GuestField | null {
  if (!partial?.type) return null;
  const current = base.fields.find((field) => field.type === partial.type) ?? {
    id: `field-${partial.type}`,
    type: partial.type,
  };
  const { shape } = guestFieldSchema;
  // An empty label or placeholder falls back to the field type's default
  return {
    ...current,
    label: validOr(shape.label, partial.label || undefined, current.label),
    placeholder: validOr(
      shape.placeholder,
      partial.placeholder || undefined,
      current.placeholder,
    ),
    required: partial.required ?? current.required,
  };
}

function mergeButton(
  base: PortalConfig,
  partial: DeepPartial<GeneratedDesign["button"]> | undefined,
): PortalConfig["button"] {
  const current = base.button;
  if (!partial) return current;
  const { shape } = buttonSchema;
  const merged = {
    ...current,
    label: validOr(shape.label, partial.label, current.label),
    backgroundColor: validOr(
      shape.backgroundColor,
      partial.backgroundColor,
      current.backgroundColor,
    ),
    textColor: validOr(shape.textColor, partial.textColor, current.textColor),
    borderRadius: validOr(
      shape.borderRadius,
      partial.borderRadius,
      current.borderRadius,
    ),
    width: validOr(shape.width, partial.width, current.width),
  };
  return clearOverridesFor(merged, changedKeys(current, merged));
}

function mergeBackground(
  base: PortalConfig,
  partial: DeepPartial<GeneratedDesign["background"]> | undefined,
): PortalConfig["background"] {
  const current = base.background;
  // The agent can't supply an image, so it can only show one already on the page, uploaded or imported before the request
  const type =
    partial?.type === "image" && !current.image
      ? "color"
      : (partial?.type ?? current.type);
  return {
    ...current,
    type,
    color: validOr(backgroundSchema.shape.color, partial?.color, current.color),
  };
}

function uniqueBy<Item>(items: Item[], key: (item: Item) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(key(item))) return false;
    seen.add(key(item));
    return true;
  });
}

/** Applies a complete or still-streaming agent design to a config, keeping the current value wherever the agent's is missing or invalid. */
export function mergeGeneratedDesign(
  base: PortalConfig,
  design: DeepPartial<GeneratedDesign> | undefined,
): PortalConfig {
  if (!design) return base;
  const texts = design.texts
    ? uniqueBy(
        design.texts.flatMap((text) => mergeText(base, text) ?? []),
        (text) => text.id,
      )
    : base.texts;
  const fields = design.fields
    ? uniqueBy(
        design.fields.flatMap((field) => mergeField(base, field) ?? []),
        (field) => field.type,
      ).slice(0, MAX_GUEST_FIELDS)
    : base.fields;
  const parsed = portalConfigSchema.safeParse({
    ...base,
    texts,
    fields,
    background: mergeBackground(base, design.background),
    button: mergeButton(base, design.button),
  });
  return parsed.success ? parsed.data : base;
}
