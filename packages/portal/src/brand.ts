import { z } from "zod";
import { centeredBackgroundPosition } from "./defaults";
import { contrastRatio, readableTextColor } from "./renderer/contrast";
import {
  backgroundPositionRecommendationSchema,
  colorSchema,
  type PortalConfig,
  type TextElement,
} from "./schema";
import { templates, type TemplateId } from "./templates";

/** The branding details an import can fail to find, as listed in a brand profile's `missing`. */
export const brandDetails = ["name", "logo", "image", "colors"] as const;

export const BRAND_NAME_MAX = 60;

export const BRAND_COLORS_MAX = 6;

export const BRAND_DESCRIPTION_MAX = 200;

/** What a website branding import extracts, and what branded designs are built from. */
export const brandProfileSchema = z.object({
  // The page's final address after redirects
  sourceUrl: z.url({ protocol: /^https?$/ }),
  name: z.string().trim().min(1).max(BRAND_NAME_MAX),
  // Optional so brands saved before descriptions were imported still load
  description: z.string().max(BRAND_DESCRIPTION_MAX).nullable().optional(),
  // Data URLs, so a design never depends on the customer's site staying up
  logo: z.string().nullable(),
  image: z.string().nullable(),
  // Always null from the server, since the image is analysed in the browser
  imageRecommended: backgroundPositionRecommendationSchema.nullable(),
  colors: z.array(colorSchema).max(BRAND_COLORS_MAX),
  primaryColor: colorSchema.nullable(),
  missing: z.array(z.enum(brandDetails)),
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;

// Past this length a name no longer fits the templates' heading sizes on a phone
const LONG_NAME_LENGTH = 24;

// Small enough that a name of the maximum length wraps to at most three lines in the mobile frame
const longNameFontSize = { shared: 36, mobile: 24 };

function brandedHeading(heading: TextElement, text: string, name: string) {
  if (name.length <= LONG_NAME_LENGTH) return { ...heading, text };
  const mobile = heading.overrides?.mobile;
  return {
    ...heading,
    text,
    fontSize: Math.min(heading.fontSize, longNameFontSize.shared),
    overrides: {
      ...heading.overrides,
      mobile: {
        ...mobile,
        fontSize: Math.min(
          mobile?.fontSize ?? heading.fontSize,
          longNameFontSize.mobile,
        ),
      },
    },
  };
}

function withHeading(
  config: PortalConfig,
  headingId: string,
  text: string,
  name: string,
): PortalConfig {
  return {
    ...config,
    texts: config.texts.map((current) =>
      current.id === headingId ? brandedHeading(current, text, name) : current,
    ),
  };
}

/** The WCAG AA contrast ratio for normal-size text. */
export const MIN_TEXT_CONTRAST = 4.5;

// The perceived-brightness pick misjudges some mid tones, and one of pure black or white always reaches the minimum
function readableOn(color: string) {
  const preferred = readableTextColor(color);
  if (contrastRatio(preferred, color) >= MIN_TEXT_CONTRAST) return preferred;
  return contrastRatio("#ffffff", color) >= contrastRatio("#000000", color)
    ? "#ffffff"
    : "#000000";
}

function withBrandColor(
  templateId: TemplateId,
  config: PortalConfig,
  primary: string,
  headingId: string,
): PortalConfig {
  const onPrimary = readableOn(primary);
  switch (templateId) {
    case "minimal":
      return {
        ...config,
        texts: config.texts.map((text) => ({ ...text, color: onPrimary })),
        background: { ...config.background, color: primary },
        button: {
          ...config.button,
          backgroundColor: onPrimary,
          textColor: primary,
        },
      };
    case "event":
      return {
        ...config,
        background: { ...config.background, color: primary },
        button: {
          ...config.button,
          backgroundColor: primary,
          textColor: onPrimary,
        },
      };
    case "corporate": {
      const headingReadable =
        contrastRatio(primary, config.background.color) >= MIN_TEXT_CONTRAST;
      return {
        ...config,
        texts: headingReadable
          ? config.texts.map((text) =>
              text.id === headingId ? { ...text, color: primary } : text,
            )
          : config.texts,
        button: {
          ...config.button,
          backgroundColor: primary,
          textColor: onPrimary,
        },
      };
    }
  }
}

// A placeholder would look like a failed import on a branded page, so a brand without a logo shows none
function withBrandLogo(
  config: PortalConfig,
  brand: BrandProfile,
): PortalConfig {
  const logo = brand.logo
    ? {
        ...config.branding.logo,
        src: brand.logo,
        alt: `${brand.name} logo`,
      }
    : null;
  return { ...config, branding: { ...config.branding, logo } };
}

function withBrandImage(
  config: PortalConfig,
  brand: BrandProfile,
): PortalConfig {
  const { image } = config.background;
  if (!brand.image || !image) return config;
  return {
    ...config,
    background: {
      ...config.background,
      image: {
        src: brand.image,
        fit: image.fit,
        overlay: image.overlay,
        position: centeredBackgroundPosition,
        recommended: brand.imageRecommended,
      },
    },
  };
}

const headingTexts: Record<
  TemplateId,
  { id: string; text: (name: string) => string }
> = {
  minimal: { id: "welcome-heading", text: (name) => `Welcome to ${name}` },
  event: { id: "event-title", text: (name) => name },
  corporate: { id: "corporate-heading", text: (name) => `Welcome to ${name}` },
};

/** Returns a template's config with a brand profile applied, or the template unchanged without one. */
export function brandedConfig(
  templateId: TemplateId,
  brand: BrandProfile | null,
): PortalConfig {
  const { config } = templates[templateId];
  if (!brand) return config;
  const heading = headingTexts[templateId];
  let branded = withBrandLogo(
    withHeading(config, heading.id, heading.text(brand.name), brand.name),
    brand,
  );
  if (templateId === "event") branded = withBrandImage(branded, brand);
  return brand.primaryColor
    ? withBrandColor(templateId, branded, brand.primaryColor, heading.id)
    : branded;
}
