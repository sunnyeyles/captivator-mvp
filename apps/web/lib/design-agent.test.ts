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
