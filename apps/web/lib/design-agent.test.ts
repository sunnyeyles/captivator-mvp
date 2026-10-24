import {
  defaultPortalConfig,
  portalConfigSchema,
  templates,
  type PortalConfig,
} from "@repo/portal";
import { describe, expect, it } from "vitest";
import {
  designRequestSchema,
  mergeGeneratedDesign,
  toGeneratedDesign,
  withAssets,
  type GeneratedDesign,
} from "./design-agent";

const base: PortalConfig = templates.event.config;

const design: GeneratedDesign = {
  texts: [
    {
      id: "event-title",
      text: "Game day Wi-Fi",
      fontSize: 60,
      color: "#facc15",
      fontWeight: 700,
      textAlign: "center",
    },
  ],
  background: { type: "color", color: "#0b1f4b" },
  fields: [
    { type: "name", label: "", placeholder: "", required: true },
    {
      type: "phone",
      label: "Mobile",
      placeholder: "04xx xxx xxx",
      required: false,
    },
  ],
  button: {
    label: "Go footy",
    backgroundColor: "#facc15",
    textColor: "#0b1f4b",
    borderRadius: 12,
    width: 80,
  },
};

describe("mergeGeneratedDesign", () => {
  it("applies a complete design as a valid config", () => {
    const merged = mergeGeneratedDesign(base, design);

    expect(portalConfigSchema.safeParse(merged).success).toBe(true);
    expect(merged.texts.map((text) => text.text)).toEqual(["Game day Wi-Fi"]);
    expect(merged.background.type).toBe("color");
    expect(merged.background.color).toBe("#0b1f4b");
    expect(merged.button.label).toBe("Go footy");
    expect(merged.fields.map((field) => field.type)).toEqual(["name", "phone"]);
  });

  it("keeps what the agent can't set, such as the logo and background image", () => {
    const merged = mergeGeneratedDesign(base, design);

    expect(merged.branding).toEqual(base.branding);
    expect(merged.background.image).toEqual(base.background.image);
  });

  it("clears the device overrides of values the agent changed", () => {
    const merged = mergeGeneratedDesign(base, design);

    expect(merged.texts[0]?.overrides).toBeUndefined();
  });

  it("keeps device overrides of values the agent left alone", () => {
    const title = base.texts[0]!;
    const merged = mergeGeneratedDesign(base, {
      texts: [{ ...toGeneratedDesign(base).texts[0]!, text: "New title" }],
    });

    expect(merged.texts[0]?.overrides).toEqual(title.overrides);
  });

  it("falls back to the current value for invalid ones", () => {
    const merged = mergeGeneratedDesign(base, {
      button: { backgroundColor: "pink", borderRadius: 400, label: "" },
      texts: [{ id: "new-text", text: "Hi", fontWeight: 900 }],
    });

    expect(merged.button).toEqual(base.button);
    expect(merged.texts[0]?.fontWeight).toBe(400);
  });

  it("uses the field type's default for empty labels", () => {
    const merged = mergeGeneratedDesign(base, design);

    expect(merged.fields[0]?.label).toBeUndefined();
    expect(merged.fields[1]?.label).toBe("Mobile");
  });

  it("drops repeated field types and fields past the limit", () => {
    const merged = mergeGeneratedDesign(base, {
      fields: [
        { type: "email" },
        { type: "email" },
        { type: "name" },
        { type: "phone" },
      ],
    });

    expect(merged.fields.map((field) => field.type)).toEqual(["email", "name"]);
  });

  it("only shows a background image the page already has", () => {
    const merged = mergeGeneratedDesign(defaultPortalConfig, {
      background: { type: "image" },
    });

    expect(merged.background.type).toBe("color");
  });

  it("keeps the current design until the agent's parts arrive", () => {
    expect(mergeGeneratedDesign(base, undefined)).toBe(base);
    expect(
      mergeGeneratedDesign(base, { texts: [{ id: "event-title" }] }).button,
    ).toEqual(base.button);
  });

  it("skips texts whose id hasn't streamed yet", () => {
    const merged = mergeGeneratedDesign(base, { texts: [{ text: "Hel" }] });

    expect(merged.texts).toEqual([]);
  });
});

describe("toGeneratedDesign", () => {
  it("describes every template in a shape the route accepts", () => {
    for (const template of Object.values(templates)) {
      const request = {
        messages: [{ role: "user", content: "Make it blue" }],
        design: toGeneratedDesign(template.config),
        hasBackgroundImage: template.config.background.image !== null,
      };
      expect(designRequestSchema.safeParse(request).success).toBe(true);
    }
  });

  it("round-trips through the merge unchanged", () => {
    const config = templates.corporate.config;

    expect(mergeGeneratedDesign(config, toGeneratedDesign(config))).toEqual(
      config,
    );
  });
});

const upload = {
  src: "blob:http://localhost/upload",
  recommended: null,
};

describe("withAssets", () => {
  it("places an uploaded background and shows it", () => {
    const placed = withAssets(defaultPortalConfig, { background: upload });

    expect(placed.background.type).toBe("image");
    expect(placed.background.image?.src).toBe(upload.src);
    expect(portalConfigSchema.safeParse(placed).success).toBe(true);
  });

  it("keeps the fit and overlay of the image it replaces", () => {
    const placed = withAssets(base, { background: upload });

    expect(placed.background.image).toMatchObject({
      src: upload.src,
      fit: base.background.image!.fit,
      overlay: base.background.image!.overlay,
    });
  });

  it("replaces the logo's source but keeps its size and overrides", () => {
    const withLogo: PortalConfig = {
      ...defaultPortalConfig,
      branding: {
        logo: {
          src: "blob:http://localhost/old",
          alt: "Acme logo",
          maxHeight: 80,
          overrides: { mobile: { maxHeight: 40 } },
        },
      },
    };

    const placed = withAssets(withLogo, { logo: "data:image/png;base64,AA" });

    expect(placed.branding.logo).toEqual({
      ...withLogo.branding.logo,
      src: "data:image/png;base64,AA",
    });
  });

  it("leaves a config without assets as it was", () => {
    expect(withAssets(base)).toEqual(base);
  });
});

describe("mergeGeneratedDesign with assets", () => {
  it("lets the agent show an uploaded background", () => {
    const placed = withAssets(defaultPortalConfig, { background: upload });

    const merged = mergeGeneratedDesign(placed, {
      background: { type: "image", color: "#111111" },
    });

    expect(merged.background.type).toBe("image");
    expect(merged.background.image?.src).toBe(upload.src);
  });

  it("lets the agent switch an uploaded background back to a colour", () => {
    const placed = withAssets(defaultPortalConfig, { background: upload });

    const merged = mergeGeneratedDesign(placed, {
      background: { type: "color" },
    });

    expect(merged.background.type).toBe("color");
    expect(merged.background.image?.src).toBe(upload.src);
  });
});

describe("designRequestSchema brand", () => {
  const request = {
    messages: [{ role: "user", content: "Design a page using my brand" }],
    design: toGeneratedDesign(defaultPortalConfig),
    hasBackgroundImage: false,
  };
  const brand = {
    name: "Acme Coffee",
    description: "Small-batch roasts",
    sourceUrl: "https://acme.example/",
    colors: ["#1d4ed8", "#ffffff"],
    hasLogo: true,
  };

  it("accepts a request without a brand", () => {
    expect(designRequestSchema.safeParse(request).success).toBe(true);
  });

  it("accepts a website brand and an upload's colours alone", () => {
    for (const value of [brand, { colors: ["#000000"], hasLogo: false }]) {
      expect(
        designRequestSchema.safeParse({ ...request, brand: value }).success,
      ).toBe(true);
    }
  });

  it.each([
    ["too many colours", { colors: Array(7).fill("#000000") }],
    ["a colour that isn't hex", { colors: ["blue"] }],
    ["an overlong description", { description: "a".repeat(201) }],
    ["an overlong name", { name: "a".repeat(61) }],
    ["a non-web source", { sourceUrl: "javascript:alert(1)" }],
    ["a missing logo flag", { hasLogo: undefined }],
  ])("rejects %s", (_label, change) => {
    expect(
      designRequestSchema.safeParse({
        ...request,
        brand: { ...brand, ...change },
      }).success,
    ).toBe(false);
  });
});
