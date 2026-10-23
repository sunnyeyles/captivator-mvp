import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { brandedConfig, brandProfileSchema, type BrandProfile } from "./brand";
import { contrastRatio } from "./renderer/contrast";
import { SplashPage } from "./renderer/splash-page";
import { devices, portalConfigSchema, type PortalConfig } from "./schema";
import { templateIds, templates, type TemplateId } from "./templates";

const brand: BrandProfile = {
  sourceUrl: "https://acme.example/",
  name: "Acme Coffee",
  logo: null,
  image: null,
  imageRecommended: null,
  colors: [],
  primaryColor: null,
  missing: ["logo", "image", "colors"],
};

const pngLogo = "data:image/png;base64,iVBORw0KGgo=";
const svgLogo = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
const jpegImage = "data:image/jpeg;base64,/9j/4AAQ";

const recommended = {
  desktop: { x: 50, y: 30 },
  tablet: { x: 40, y: 35 },
  mobile: { x: 25, y: 40 },
};

const fullBrand: BrandProfile = {
  ...brand,
  logo: pngLogo,
  image: jpegImage,
  imageRecommended: recommended,
  colors: ["#1d4ed8", "#f8fafc"],
  primaryColor: "#1d4ed8",
  missing: [],
};

const longName = "The Very Long Named Neighbourhood Coffee Roasters and Bakery";

const brands: Record<string, BrandProfile> = {
  "a short name": brand,
  "a 60-character name": { ...brand, name: longName },
  "a hostname fallback": {
    ...brand,
    name: "Acme",
    missing: ["name", "logo", "image", "colors"],
  },
  "full branding": fullBrand,
  "no colours": {
    ...fullBrand,
    colors: [],
    primaryColor: null,
    missing: ["colors"],
  },
  "a near-white primary": { ...fullBrand, primaryColor: "#fafafa" },
  "a near-black primary": { ...fullBrand, primaryColor: "#0a0a0a" },
  "a mid-tone primary": { ...fullBrand, primaryColor: "#808080" },
  "a light primary": { ...fullBrand, primaryColor: "#fbbf24" },
  "an SVG logo": { ...fullBrand, logo: svgLogo },
  "no logo or image": {
    ...fullBrand,
    logo: null,
    image: null,
    imageRecommended: null,
    missing: ["logo", "image"],
  },
};

const uncoloredBrands = Object.entries(brands).filter(
  ([, profile]) => profile.primaryColor === null,
);

const headingIds: Record<TemplateId, string> = {
  minimal: "welcome-heading",
  event: "event-title",
  corporate: "corporate-heading",
};

const headingTexts: Record<TemplateId, (name: string) => string> = {
  minimal: (name) => `Welcome to ${name}`,
  event: (name) => name,
  corporate: (name) => `Welcome to ${name}`,
};

function casesFor(entries: [string, BrandProfile][]) {
  return templateIds.flatMap((id) =>
    entries.map(([label, profile]) => ({ id, label, profile })),
  );
}

const cases = casesFor(Object.entries(brands));

function heading(id: TemplateId, profile: BrandProfile | null) {
  return brandedConfig(id, profile).texts.find(
    (text) => text.id === headingIds[id],
  );
}

describe("brandProfileSchema", () => {
  it("accepts a profile with only a name", () => {
    expect(brandProfileSchema.safeParse(brand).error).toBeUndefined();
  });

  it("trims the name", () => {
    expect(brandProfileSchema.parse({ ...brand, name: "  Acme  " }).name).toBe(
      "Acme",
    );
  });

  it.each([
    { name: "" },
    { name: "   " },
    { name: "x".repeat(61) },
    { sourceUrl: "ftp://acme.example/" },
    { sourceUrl: "not a url" },
    {
      colors: [
        "#000000",
        "#111111",
        "#222222",
        "#333333",
        "#444444",
        "#555555",
        "#666666",
      ],
    },
    { primaryColor: "red" },
    { missing: ["font"] },
  ])("rejects %j", (changes) => {
    expect(brandProfileSchema.safeParse({ ...brand, ...changes }).success).toBe(
      false,
    );
  });
});

describe("brandedConfig", () => {
  it.each(templateIds)("returns %s unchanged without a brand", (id) => {
    expect(brandedConfig(id, null)).toBe(templates[id].config);
  });

  it.each(cases)(
    "$id with $label parses against the portal schema",
    ({ id, profile }) => {
      const config = brandedConfig(id, profile);

      expect(portalConfigSchema.safeParse(config).error).toBeUndefined();
    },
  );

  it.each(cases)("$id with $label greets guests by name", ({ id, profile }) => {
    expect(heading(id, profile)?.text).toBe(headingTexts[id](profile.name));
  });

  it.each(cases)(
    "$id with $label keeps every other text's wording, the fields and the button label",
    ({ id, profile }) => {
      const template = templates[id].config;
      const config = brandedConfig(id, profile);
      const words = (texts: PortalConfig["texts"]) =>
        texts
          .filter((text) => text.id !== headingIds[id])
          .map(({ id: textId, text }) => ({ textId, text }));

      expect(words(config.texts)).toEqual(words(template.texts));
      expect(config.texts.map((text) => text.id)).toEqual(
        template.texts.map((text) => text.id),
      );
      expect(config.fields).toEqual(template.fields);
      expect(config.button.label).toBe(template.button.label);
    },
  );

  it.each(casesFor(uncoloredBrands))(
    "$id with $label keeps the template's colours",
    ({ id, profile }) => {
      const template = templates[id].config;
      const config = brandedConfig(id, profile);

      expect(config.texts.map((text) => text.color)).toEqual(
        template.texts.map((text) => text.color),
      );
      expect(config.background.color).toBe(template.background.color);
      expect(config.button).toEqual(template.button);
    },
  );

  it.each(cases)(
    "$id with $label gives the button label at least 4.5:1 contrast",
    ({ id, profile }) => {
      const { button } = brandedConfig(id, profile);

      expect(
        contrastRatio(button.backgroundColor, button.textColor),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(cases)(
    "$id with $label shows the brand's logo or none",
    ({ id, profile }) => {
      const { logo } = brandedConfig(id, profile).branding;

      if (profile.logo) {
        expect(logo).toEqual({
          ...templates[id].config.branding.logo,
          src: profile.logo,
          alt: `${profile.name} logo`,
        });
      } else {
        expect(logo).toBeNull();
      }
    },
  );

  it("fills Minimal's background with the primary colour and keeps its text readable", () => {
    const config = brandedConfig("minimal", fullBrand);

    expect(config.background).toEqual({
      ...templates.minimal.config.background,
      color: "#1d4ed8",
    });
    for (const text of config.texts) {
      expect(contrastRatio(text.color, "#1d4ed8")).toBeGreaterThanOrEqual(4.5);
    }
    expect(config.button.textColor).toBe("#1d4ed8");
    expect(config.button.backgroundColor).toBe("#ffffff");
  });

  it.each(["event", "corporate"] as const)(
    "fills the %s button with the primary colour",
    (id) => {
      const { button } = brandedConfig(id, fullBrand);

      expect(button.backgroundColor).toBe("#1d4ed8");
      expect(button.textColor).toBe("#ffffff");
    },
  );

  it("puts the brand image behind Event, centred, over the primary colour", () => {
    const template = templates.event.config.background.image!;
    const { background } = brandedConfig("event", fullBrand);

    expect(background).toEqual({
      type: "image",
      color: "#1d4ed8",
      image: {
        src: jpegImage,
        fit: template.fit,
        overlay: template.overlay,
        position: { x: 50, y: 50 },
        recommended,
      },
    });
  });

  it("keeps the Event texts' colours, which sit on the overlay", () => {
    expect(
      brandedConfig("event", fullBrand).texts.map((text) => text.color),
    ).toEqual(templates.event.config.texts.map((text) => text.color));
  });

  it("keeps the Event template's image when the brand has none", () => {
    const { background } = brandedConfig("event", brands["no logo or image"]!);

    expect(background.image).toEqual(templates.event.config.background.image);
    expect(background.color).toBe("#1d4ed8");
  });

  it("keeps Corporate's light background", () => {
    expect(brandedConfig("corporate", fullBrand).background).toEqual(
      templates.corporate.config.background,
    );
  });

  it("uses a readable primary colour for the Corporate heading", () => {
    expect(heading("corporate", fullBrand)?.color).toBe("#1d4ed8");
  });

  it("keeps the Corporate heading colour when the primary is too light", () => {
    const template = templates.corporate.config.texts.find(
      (text) => text.id === "corporate-heading",
    );

    expect(heading("corporate", brands["a light primary"]!)?.color).toBe(
      template?.color,
    );
  });

  it.each(cases)(
    "$id with $label keeps the Corporate heading at 4.5:1 or more",
    ({ profile }) => {
      const config = brandedConfig("corporate", profile);

      expect(
        contrastRatio(
          heading("corporate", profile)!.color,
          config.background.color,
        ),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(
    templateIds.flatMap((id) =>
      Object.entries(brands).flatMap(([label, profile]) =>
        devices.map((device) => ({ id, label, profile, device })),
      ),
    ),
  )(
    "$id with $label renders its texts, fields and button on $device",
    ({ id, profile, device }) => {
      const config = brandedConfig(id, profile);
      const html = renderToStaticMarkup(
        <SplashPage config={config} device={device} mode="published" />,
      );

      for (const text of config.texts) expect(html).toContain(text.text);
      expect(html.match(/<input/g)).toHaveLength(config.fields.length);
      expect(html).toContain(config.button.label);
      if (config.branding.logo)
        expect(html).toContain(config.branding.logo.src);
    },
  );

  it.each(templateIds)("keeps the %s heading size for a short name", (id) => {
    const template = templates[id].config.texts.find(
      (text) => text.id === headingIds[id],
    );

    expect(heading(id, brand)).toEqual({
      ...template,
      text: headingTexts[id](brand.name),
    });
  });

  it.each(templateIds)("steps the %s heading down for a long name", (id) => {
    const branded = heading(id, { ...brand, name: longName });

    expect(branded?.fontSize).toBe(36);
    expect(branded?.overrides?.mobile?.fontSize).toBe(24);
  });

  it("keeps a 24-character name at the template size", () => {
    const name = "x".repeat(24);

    expect(heading("minimal", { ...brand, name })?.fontSize).toBe(48);
  });

  it("keeps the Event title's mobile override for a short name", () => {
    expect(heading("event", brand)?.overrides).toEqual({
      mobile: { fontSize: 40 },
    });
  });

  it("shows the stepped-down long name on mobile and desktop", () => {
    const config = brandedConfig("event", { ...brand, name: longName });
    const render = (device: "desktop" | "mobile") =>
      renderToStaticMarkup(
        <SplashPage config={config} device={device} mode="published" />,
      );

    expect(render("desktop")).toContain("font-size:36px");
    expect(render("mobile")).toContain("font-size:24px");
  });
});
