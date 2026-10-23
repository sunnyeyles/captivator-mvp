import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { brandedConfig, brandProfileSchema, type BrandProfile } from "./brand";
import { SplashPage } from "./renderer/splash-page";
import { devices, portalConfigSchema } from "./schema";
import { templateIds, templates, type TemplateId } from "./templates";

const brand: BrandProfile = {
  sourceUrl: "https://acme.example/",
  name: "Acme Coffee",
  logo: null,
  image: null,
  colors: [],
  primaryColor: null,
  missing: ["logo", "image", "colors"],
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
};

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

const cases = templateIds.flatMap((id) =>
  Object.entries(brands).map(([label, profile]) => ({ id, label, profile })),
);

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
    "$id with $label keeps every other text and the rest of the design",
    ({ id, profile }) => {
      const template = templates[id].config;
      const config = brandedConfig(id, profile);

      expect(config.texts.filter((text) => text.id !== headingIds[id])).toEqual(
        template.texts.filter((text) => text.id !== headingIds[id]),
      );
      expect(config.texts.map((text) => text.id)).toEqual(
        template.texts.map((text) => text.id),
      );
      expect(config.background).toEqual(template.background);
      expect(config.fields).toEqual(template.fields);
      expect(config.button).toEqual(template.button);
      expect(config.branding).toEqual(template.branding);
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
