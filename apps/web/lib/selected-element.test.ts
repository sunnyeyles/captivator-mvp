import {
  CONNECT_BUTTON_ID,
  defaultPortalConfig,
  LOGO_ELEMENT_ID,
} from "@repo/portal";
import { describe, expect, it } from "vitest";
import { findSelectedElement } from "./selected-element";

describe("findSelectedElement", () => {
  it("finds a selected text element", () => {
    const text = defaultPortalConfig.texts[0]!;

    expect(findSelectedElement(defaultPortalConfig, text.id)).toEqual({
      id: text.id,
      kind: "text",
      element: text,
    });
  });

  it("finds a selected guest field", () => {
    const field = defaultPortalConfig.fields[0]!;

    expect(findSelectedElement(defaultPortalConfig, field.id)).toEqual({
      id: field.id,
      kind: "field",
      element: field,
    });
  });

  it("finds the Connect button", () => {
    expect(findSelectedElement(defaultPortalConfig, CONNECT_BUTTON_ID)).toEqual(
      {
        id: CONNECT_BUTTON_ID,
        kind: "button",
        element: defaultPortalConfig.button,
      },
    );
  });

  it("returns the config's own objects so a shallow compare sees no change", () => {
    const logo = { src: "blob:http://localhost/logo", alt: "Logo" };
    const config = { ...defaultPortalConfig, branding: { logo } };

    expect(findSelectedElement(config, CONNECT_BUTTON_ID)?.element).toBe(
      config.button,
    );
    expect(findSelectedElement(config, LOGO_ELEMENT_ID)?.element).toBe(logo);
  });

  it("returns null when nothing is selected", () => {
    expect(findSelectedElement(defaultPortalConfig, null)).toBeNull();
  });

  it("returns null for an id that is no longer in the config", () => {
    expect(findSelectedElement(defaultPortalConfig, "removed")).toBeNull();
  });

  it("finds the selected logo", () => {
    const logo = { src: "blob:http://localhost/logo", alt: "Logo" };

    expect(
      findSelectedElement(
        { ...defaultPortalConfig, branding: { logo } },
        LOGO_ELEMENT_ID,
      ),
    ).toEqual({ id: LOGO_ELEMENT_ID, kind: "logo", element: logo });
  });

  it("returns null for the logo once it is removed", () => {
    expect(
      findSelectedElement(defaultPortalConfig, LOGO_ELEMENT_ID),
    ).toBeNull();
  });
});
