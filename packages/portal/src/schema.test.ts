import { describe, expect, it } from "vitest";
import { defaultPortalConfig } from "./defaults";
import {
  backgroundSchema,
  BUTTON_LABEL_MAX,
  BUTTON_RADIUS_MAX,
  BUTTON_RADIUS_MIN,
  BUTTON_WIDTH_MAX,
  BUTTON_WIDTH_MIN,
  buttonSchema,
  colorSchema,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  GUEST_FIELD_LABEL_MAX,
  GUEST_FIELD_PLACEHOLDER_MAX,
  guestFieldSchema,
  IMAGE_MAX_BYTES,
  imageFileSchema,
  portalConfigSchema,
  textElementSchema,
  type ConnectButton,
  type GuestField,
  type TextElement,
} from "./schema";

const text: TextElement = {
  id: "welcome-heading",
  text: "Welcome to our Wi-Fi",
  fontSize: 32,
  color: "#FFFFFF",
  fontWeight: 700,
  textAlign: "center",
};

describe("portalConfigSchema", () => {
  it("accepts the default config", () => {
    expect(portalConfigSchema.parse(defaultPortalConfig)).toEqual(
      defaultPortalConfig,
    );
  });

  it("accepts a config with no text", () => {
    expect(
      portalConfigSchema.safeParse({ ...defaultPortalConfig, texts: [] })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid background colour", () => {
    const result = portalConfigSchema.safeParse({
      ...defaultPortalConfig,
      background: { ...defaultPortalConfig.background, color: "not-a-colour" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid text colour", () => {
    const result = portalConfigSchema.safeParse({
      ...defaultPortalConfig,
      texts: [{ ...text, color: "#12345" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate text ids", () => {
    const result = portalConfigSchema.safeParse({
      ...defaultPortalConfig,
      texts: [text, { ...text, text: "Again" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("textElementSchema", () => {
  it("accepts the spec's example text element", () => {
    expect(textElementSchema.parse(text)).toEqual(text);
  });

  it.each([FONT_SIZE_MIN, 32, FONT_SIZE_MAX])(
    "accepts font size %d",
    (fontSize) => {
      expect(textElementSchema.safeParse({ ...text, fontSize }).success).toBe(
        true,
      );
    },
  );

  it.each([FONT_SIZE_MIN - 1, FONT_SIZE_MAX + 1, 0, -12, 20.5, Number.NaN])(
    "rejects font size %d",
    (fontSize) => {
      expect(textElementSchema.safeParse({ ...text, fontSize }).success).toBe(
        false,
      );
    },
  );

  it.each([100, 300, 800, 650])("rejects font weight %d", (fontWeight) => {
    expect(textElementSchema.safeParse({ ...text, fontWeight }).success).toBe(
      false,
    );
  });

  it.each(["justify", "start", ""])("rejects alignment %j", (textAlign) => {
    expect(textElementSchema.safeParse({ ...text, textAlign }).success).toBe(
      false,
    );
  });

  it.each([
    undefined,
    {},
    { mobile: { fontSize: 24 } },
    { tablet: { fontSize: 32, textAlign: "left" } },
    {
      desktop: { textAlign: "left" },
      mobile: { fontSize: FONT_SIZE_MIN, textAlign: "right" },
    },
  ])("accepts overrides %j", (overrides) => {
    expect(textElementSchema.safeParse({ ...text, overrides }).success).toBe(
      true,
    );
  });

  it.each([
    { mobile: { fontSize: FONT_SIZE_MIN - 1 } },
    { mobile: { fontSize: FONT_SIZE_MAX + 1 } },
    { desktop: { fontSize: 20.5 } },
    { mobile: { textAlign: "justify" } },
    { tablet: { fontSize: FONT_SIZE_MAX + 1 } },
  ])("validates override %j like the shared style", (overrides) => {
    expect(textElementSchema.safeParse({ ...text, overrides }).success).toBe(
      false,
    );
  });

  it.each([
    { mobile: { color: "#000000" } },
    { mobile: { text: "Mobile only copy" } },
    { mobile: { id: "other" } },
  ])("rejects override %j outside the overridable styles", (overrides) => {
    expect(textElementSchema.safeParse({ ...text, overrides }).success).toBe(
      false,
    );
  });

  it("rejects an empty id", () => {
    expect(textElementSchema.safeParse({ ...text, id: "" }).success).toBe(
      false,
    );
  });
});

describe("colorSchema", () => {
  it.each(["#fff", "#FFFFFF", "#1c1917"])("accepts %s", (value) => {
    expect(colorSchema.safeParse(value).success).toBe(true);
  });

  it.each(["", "fff", "#ffff", "#gggggg", "red", "rgb(0, 0, 0)", "#1c1917 "])(
    "rejects %j",
    (value) => {
      expect(colorSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("guest fields", () => {
  const name: GuestField = { id: "field-1", type: "name" };
  const email: GuestField = {
    id: "field-2",
    type: "email",
    label: "Your email",
    placeholder: "you@example.com",
    required: true,
  };
  const phone: GuestField = { id: "field-3", type: "phone" };

  function parseFields(fields: unknown[]) {
    return portalConfigSchema.safeParse({ ...defaultPortalConfig, fields });
  }

  it.each([[[]], [[name]], [[name, email]], [[phone, email]]])(
    "accepts %j",
    (fields) => {
      expect(parseFields(fields).success).toBe(true);
    },
  );

  it("rejects a third field", () => {
    expect(parseFields([name, email, phone]).success).toBe(false);
  });

  it("rejects two fields of the same type", () => {
    expect(parseFields([name, { ...name, id: "field-2" }]).success).toBe(false);
  });

  it("rejects duplicate field ids", () => {
    expect(parseFields([name, { ...email, id: name.id }]).success).toBe(false);
  });

  it.each(["address", "Name", "", "text"])("rejects type %j", (type) => {
    expect(guestFieldSchema.safeParse({ ...name, type }).success).toBe(false);
  });

  it("keeps label, placeholder and required optional", () => {
    expect(guestFieldSchema.parse(name)).toEqual(name);
    expect(guestFieldSchema.parse(email)).toEqual(email);
  });

  it("rejects an over-long label or placeholder", () => {
    expect(
      guestFieldSchema.safeParse({
        ...name,
        label: "a".repeat(GUEST_FIELD_LABEL_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      guestFieldSchema.safeParse({
        ...name,
        placeholder: "a".repeat(GUEST_FIELD_PLACEHOLDER_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects a non-boolean required flag", () => {
    expect(
      guestFieldSchema.safeParse({ ...name, required: "yes" }).success,
    ).toBe(false);
  });
});

describe("buttonSchema", () => {
  const button: ConnectButton = defaultPortalConfig.button;

  it("accepts the default button", () => {
    expect(buttonSchema.parse(button)).toEqual(button);
  });

  it.each([
    { backgroundColor: "blue" },
    { textColor: "#12345" },
    { backgroundColor: "" },
  ])("rejects colours %j", (changes) => {
    expect(buttonSchema.safeParse({ ...button, ...changes }).success).toBe(
      false,
    );
  });

  it.each([BUTTON_RADIUS_MIN, 12, BUTTON_RADIUS_MAX])(
    "accepts radius %d",
    (borderRadius) => {
      expect(buttonSchema.safeParse({ ...button, borderRadius }).success).toBe(
        true,
      );
    },
  );

  it.each([BUTTON_RADIUS_MIN - 1, BUTTON_RADIUS_MAX + 1, 4.5, Number.NaN])(
    "rejects radius %d",
    (borderRadius) => {
      expect(buttonSchema.safeParse({ ...button, borderRadius }).success).toBe(
        false,
      );
    },
  );

  it.each([BUTTON_WIDTH_MIN, 60, BUTTON_WIDTH_MAX])(
    "accepts width %d",
    (width) => {
      expect(buttonSchema.safeParse({ ...button, width }).success).toBe(true);
    },
  );

  it.each([BUTTON_WIDTH_MIN - 1, BUTTON_WIDTH_MAX + 1, 0, 50.5, Number.NaN])(
    "rejects width %d",
    (width) => {
      expect(buttonSchema.safeParse({ ...button, width }).success).toBe(false);
    },
  );

  it.each(["", "   ", "a".repeat(BUTTON_LABEL_MAX + 1)])(
    "rejects label %j",
    (label) => {
      expect(buttonSchema.safeParse({ ...button, label }).success).toBe(false);
    },
  );

  it("rejects a config without a button", () => {
    const { button: _button, ...withoutButton } = defaultPortalConfig;

    expect(portalConfigSchema.safeParse(withoutButton).success).toBe(false);
  });
});

describe("backgroundSchema", () => {
  const image = {
    src: "blob:http://localhost/1",
    fit: "cover",
    position: "center",
    overlay: { color: "#000000", opacity: 0.5 },
  } as const;

  it("accepts a solid colour", () => {
    expect(
      backgroundSchema.safeParse({ type: "color", color: "#fff", image: null })
        .success,
    ).toBe(true);
  });

  it("accepts an image with fit, position and overlay", () => {
    expect(
      backgroundSchema.safeParse({ type: "image", color: "#fff", image })
        .success,
    ).toBe(true);
  });

  it("accepts an image without an overlay", () => {
    expect(
      backgroundSchema.safeParse({
        type: "image",
        color: "#fff",
        image: { ...image, overlay: null },
      }).success,
    ).toBe(true);
  });

  it.each([
    { type: "gradient" },
    { image: { ...image, src: "" } },
    { image: { ...image, fit: "stretch" } },
    { image: { ...image, position: "top-left" } },
    { image: { ...image, overlay: { color: "#000000", opacity: 1.5 } } },
    { image: { ...image, overlay: { color: "#000000", opacity: -0.1 } } },
    { image: { ...image, overlay: { color: "black", opacity: 0.5 } } },
  ])("rejects %j", (changes) => {
    expect(
      backgroundSchema.safeParse({
        type: "image",
        color: "#fff",
        image,
        ...changes,
      }).success,
    ).toBe(false);
  });
});

describe("branding", () => {
  it("accepts a logo reference", () => {
    expect(
      portalConfigSchema.safeParse({
        ...defaultPortalConfig,
        branding: { logo: { src: "blob:http://localhost/2", alt: "Logo" } },
      }).success,
    ).toBe(true);
  });

  it("rejects a logo without a source", () => {
    expect(
      portalConfigSchema.safeParse({
        ...defaultPortalConfig,
        branding: { logo: { src: "", alt: "Logo" } },
      }).success,
    ).toBe(false);
  });
});

describe("imageFileSchema", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s", (type) => {
    expect(imageFileSchema.safeParse({ type, size: 1024 }).success).toBe(true);
  });

  it("accepts a file at the size limit", () => {
    expect(
      imageFileSchema.safeParse({ type: "image/png", size: IMAGE_MAX_BYTES })
        .success,
    ).toBe(true);
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])(
    "rejects %j with a message",
    (type) => {
      const result = imageFileSchema.safeParse({ type, size: 1024 });

      expect(result.error?.issues[0]?.message).toBe(
        "Upload a PNG, JPEG or WebP image",
      );
    },
  );

  it("rejects a file over the size limit with a message", () => {
    const result = imageFileSchema.safeParse({
      type: "image/png",
      size: IMAGE_MAX_BYTES + 1,
    });

    expect(result.error?.issues[0]?.message).toBe(
      "Upload an image of 5 MB or less",
    );
  });
});
