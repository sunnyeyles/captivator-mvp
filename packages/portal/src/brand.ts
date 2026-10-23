import { z } from "zod";
import { colorSchema, type PortalConfig, type TextElement } from "./schema";
import { templates, type TemplateId } from "./templates";

/** The branding details an import can fail to find, as listed in a brand profile's `missing`. */
export const brandDetails = ["name", "logo", "image", "colors"] as const;

export const BRAND_NAME_MAX = 60;

/** What a website branding import extracts, and what branded designs are built from. */
export const brandProfileSchema = z.object({
  // The page's final address after redirects
  sourceUrl: z.url({ protocol: /^https?$/ }),
  name: z.string().trim().min(1).max(BRAND_NAME_MAX),
  // Data URLs, so a design never depends on the customer's site staying up
  logo: z.string().nullable(),
  image: z.string().nullable(),
  colors: z.array(colorSchema).max(6),
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

/** Returns a template's config with a brand profile applied, or the template unchanged without one. */
export function brandedConfig(
  templateId: TemplateId,
  brand: BrandProfile | null,
): PortalConfig {
  const { config } = templates[templateId];
  if (!brand) return config;
  switch (templateId) {
    case "minimal":
      return withHeading(
        config,
        "welcome-heading",
        `Welcome to ${brand.name}`,
        brand.name,
      );
    case "event":
      return withHeading(config, "event-title", brand.name, brand.name);
    case "corporate":
      return withHeading(
        config,
        "corporate-heading",
        `Welcome to ${brand.name}`,
        brand.name,
      );
  }
}
