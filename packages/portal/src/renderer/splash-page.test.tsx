import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CONNECT_BUTTON_ID, defaultPortalConfig } from "../defaults";
import { devices, type PortalConfig } from "../schema";
import { LOGO_ELEMENT_ID, SplashPage } from "./splash-page";

const config: PortalConfig = {
  texts: [
    {
      id: "greeting",
      text: "Hello guests",
      fontSize: 40,
      color: "#ff0000",
      fontWeight: 600,
      textAlign: "right",
    },
  ],
  background: { type: "color", color: "#00ff00", image: null },
  branding: { logo: null },
  fields: [
    { id: "field-1", type: "phone", label: "Mobile", required: true },
    { id: "field-2", type: "name", placeholder: "Who are you?" },
  ],
  button: {
    label: "Get online",
    backgroundColor: "#123456",
    textColor: "#abcdef",
    borderRadius: 20,
    width: 60,
  },
};

const imageConfig: PortalConfig = {
  ...config,
  background: {
    type: "image",
    color: "#00ff00",
    image: {
      src: "blob:http://localhost/background",
      fit: "contain",
      position: "top",
      overlay: { color: "#000000", opacity: 0.25 },
    },
  },
  branding: { logo: { src: "blob:http://localhost/logo", alt: "Acme logo" } },
};

const noop = () => {};

describe("SplashPage", () => {
  it.each(devices)("renders the config on %s", (device) => {
    const html = renderToStaticMarkup(
      <SplashPage config={config} device={device} mode="edit" />,
    );

    expect(html).toContain("Hello guests");
    expect(html).toContain("background-color:#00ff00");
    expect(html).toContain("color:#ff0000");
    expect(html).toContain("font-size:40px");
    expect(html).toContain("font-weight:600");
    expect(html).toContain("text-align:right");
    expect(html).toContain(`data-device="${device}"`);
  });

  it("lays each device out differently from the same config", () => {
    const layouts = devices.map((device) =>
      renderToStaticMarkup(
        <SplashPage config={defaultPortalConfig} device={device} mode="edit" />,
      ),
    );

    expect(new Set(layouts).size).toBe(devices.length);
  });

  it("applies a device's overrides only on that device", () => {
    const overridden: PortalConfig = {
      ...config,
      texts: [
        {
          ...config.texts[0]!,
          overrides: { mobile: { fontSize: 24, textAlign: "left" } },
        },
      ],
    };
    const desktop = renderToStaticMarkup(
      <SplashPage config={overridden} device="desktop" mode="preview" />,
    );
    const mobile = renderToStaticMarkup(
      <SplashPage config={overridden} device="mobile" mode="preview" />,
    );

    expect(desktop).toContain("font-size:40px");
    expect(desktop).toContain("text-align:right");
    expect(mobile).toContain("font-size:24px");
    expect(mobile).toContain("text-align:left");
  });

  it("keeps the shared style on tablet when only mobile is overridden", () => {
    const overridden: PortalConfig = {
      ...config,
      texts: [{ ...config.texts[0]!, overrides: { mobile: { fontSize: 24 } } }],
    };
    const tablet = renderToStaticMarkup(
      <SplashPage config={overridden} device="tablet" mode="preview" />,
    );

    expect(tablet).toContain("font-size:40px");
  });

  it("falls back to shared values a device does not override", () => {
    const overridden: PortalConfig = {
      ...config,
      texts: [{ ...config.texts[0]!, overrides: { mobile: { fontSize: 24 } } }],
    };
    const mobile = renderToStaticMarkup(
      <SplashPage config={overridden} device="mobile" mode="preview" />,
    );

    expect(mobile).toContain("text-align:right");
    expect(mobile).toContain("color:#ff0000");
    expect(mobile).toContain("font-weight:600");
  });

  it("resolves spacing and width overrides for every element", () => {
    const overridden: PortalConfig = {
      ...config,
      texts: [
        {
          ...config.texts[0]!,
          spaceAbove: 8,
          overrides: { mobile: { spaceAbove: 4 } },
        },
      ],
      fields: [
        {
          ...config.fields[0]!,
          width: 80,
          spaceAbove: 12,
          overrides: { mobile: { width: 50 } },
        },
      ],
      button: {
        ...config.button,
        spaceAbove: 20,
        overrides: { mobile: { width: 90, spaceAbove: 6 } },
      },
      branding: {
        logo: {
          src: "blob:http://localhost/logo",
          alt: "Acme logo",
          maxHeight: 120,
          overrides: { mobile: { maxHeight: 48, spaceAbove: 2 } },
        },
      },
    };
    const desktop = renderToStaticMarkup(
      <SplashPage config={overridden} device="desktop" mode="preview" />,
    );
    const mobile = renderToStaticMarkup(
      <SplashPage config={overridden} device="mobile" mode="preview" />,
    );

    expect(desktop).toContain("margin-top:8px");
    expect(desktop).toContain("width:80%;margin-top:12px");
    expect(desktop).toContain("width:60%;margin-top:20px");
    expect(desktop).toContain("max-height:120px");
    expect(mobile).toContain("margin-top:4px");
    expect(mobile).toContain("width:50%;margin-top:12px");
    expect(mobile).toContain("width:90%;margin-top:6px");
    expect(mobile).toContain("max-height:48px;margin-top:2px");
  });

  it("uses layout defaults where no spacing or size is set", () => {
    const html = renderToStaticMarkup(
      <SplashPage config={imageConfig} device="mobile" mode="preview" />,
    );

    expect(html).not.toContain("margin-top");
    expect(html).toContain("width:100%");
    expect(html).toContain("max-height:96px");
  });

  it.each(devices)(
    "marks the selected element in edit mode on %s",
    (device) => {
      const html = renderToStaticMarkup(
        <SplashPage
          config={config}
          device={device}
          mode="edit"
          selectedElementId="greeting"
          onSelectElement={noop}
        />,
      );

      expect(html).toContain('data-element-id="greeting"');
      expect(html).toContain('data-selected="true"');
      expect(html).toContain('role="button"');
    },
  );

  it.each(["preview", "published"] as const)(
    "shows no selection affordances in %s mode",
    (mode) => {
      const html = renderToStaticMarkup(
        <SplashPage
          config={config}
          device="desktop"
          mode={mode}
          selectedElementId="greeting"
          onSelectElement={noop}
        />,
      );

      expect(html).toContain("Hello guests");
      expect(html).not.toContain("data-element-id");
      expect(html).not.toContain("data-selected");
      expect(html).not.toContain('role="button"');
      expect(html).not.toContain("tabindex");
    },
  );

  it("shows no selection affordances without a selection callback", () => {
    const html = renderToStaticMarkup(
      <SplashPage config={config} device="desktop" mode="edit" />,
    );

    expect(html).not.toContain("data-element-id");
  });

  it("does not call the selection callback while rendering", () => {
    const onSelectElement = vi.fn();
    renderToStaticMarkup(
      <SplashPage
        config={config}
        device="mobile"
        mode="edit"
        onSelectElement={onSelectElement}
      />,
    );

    expect(onSelectElement).not.toHaveBeenCalled();
  });

  it.each(devices)("renders guest fields in order on %s", (device) => {
    const html = renderToStaticMarkup(
      <SplashPage config={config} device={device} mode="preview" />,
    );

    expect(html.indexOf("Mobile")).toBeLessThan(html.indexOf("Name"));
    expect(html).toContain('type="tel"');
    expect(html).toContain('placeholder="Who are you?"');
    expect(html).toContain("required");
  });

  it("falls back to default labels and placeholders", () => {
    const html = renderToStaticMarkup(
      <SplashPage
        config={{
          ...config,
          fields: [{ id: "field-1", type: "email" }],
        }}
        device="desktop"
        mode="preview"
      />,
    );

    expect(html).toContain(">Email<");
    expect(html).toContain('placeholder="you@example.com"');
    expect(html).toContain('type="email"');
    expect(html).not.toContain("required");
  });

  it("renders no fields when there are none", () => {
    const html = renderToStaticMarkup(
      <SplashPage
        config={{ ...config, fields: [] }}
        device="mobile"
        mode="preview"
      />,
    );

    expect(html).not.toContain("<input");
    expect(html).toContain("Get online");
  });

  it.each(devices)("styles the Connect button on %s", (device) => {
    const html = renderToStaticMarkup(
      <SplashPage config={config} device={device} mode="preview" />,
    );

    expect(html).toContain("Get online");
    expect(html).toContain("background-color:#123456");
    expect(html).toContain("color:#abcdef");
    expect(html).toContain("border-radius:20px");
    expect(html).toContain("width:60%");
  });

  it.each(["edit", "preview", "published"] as const)(
    "has nothing that can submit or navigate in %s mode",
    (mode) => {
      const html = renderToStaticMarkup(
        <SplashPage
          config={config}
          device="desktop"
          mode={mode}
          onSelectElement={noop}
        />,
      );

      expect(html).not.toContain("<form");
      expect(html).not.toContain("<a ");
      expect(html).not.toContain("formaction");
      expect(html).not.toContain('type="submit"');
      expect(html).toContain('<button type="button"');
    },
  );

  it("makes fields and the button selectable in edit mode", () => {
    const html = renderToStaticMarkup(
      <SplashPage
        config={config}
        device="mobile"
        mode="edit"
        selectedElementId={CONNECT_BUTTON_ID}
        onSelectElement={noop}
      />,
    );

    expect(html).toContain('data-element-id="field-1"');
    expect(html).toContain('data-element-id="field-2"');
    expect(html).toMatch(
      new RegExp(`data-element-id="${CONNECT_BUTTON_ID}" data-selected="true"`),
    );
    expect(html).toContain("readOnly");
  });

  it("lets guests type into fields in preview mode", () => {
    const html = renderToStaticMarkup(
      <SplashPage config={config} device="mobile" mode="preview" />,
    );

    expect(html).not.toContain("readOnly");
    expect(html).not.toContain("data-element-id");
  });

  it.each(devices)("renders the logo and background image on %s", (device) => {
    const html = renderToStaticMarkup(
      <SplashPage config={imageConfig} device={device} mode="preview" />,
    );

    expect(html).toContain('src="blob:http://localhost/logo"');
    expect(html).toContain('alt="Acme logo"');
    expect(html).toContain(
      "background-image:url(&quot;blob:http://localhost/background&quot;)",
    );
    expect(html).toContain("background-size:contain");
    expect(html).toContain("background-position:top");
    expect(html).toContain("opacity:0.25");
  });

  it("keeps the logo and background image when switching device", () => {
    const desktop = renderToStaticMarkup(
      <SplashPage config={imageConfig} device="desktop" mode="preview" />,
    );
    const mobile = renderToStaticMarkup(
      <SplashPage config={imageConfig} device="mobile" mode="preview" />,
    );

    expect(desktop).not.toEqual(mobile);
    expect(mobile).toContain("blob:http://localhost/logo");
    expect(mobile).toContain("blob:http://localhost/background");
  });

  it("shows only the colour and no logo by default", () => {
    const html = renderToStaticMarkup(
      <SplashPage config={config} device="desktop" mode="preview" />,
    );

    expect(html).not.toContain("<img");
    expect(html).not.toContain("background-image");
    expect(html).not.toContain("opacity");
  });

  it("ignores a kept image while the background is in colour mode", () => {
    const html = renderToStaticMarkup(
      <SplashPage
        config={{
          ...imageConfig,
          background: { ...imageConfig.background, type: "color" },
        }}
        device="desktop"
        mode="preview"
      />,
    );

    expect(html).toContain("background-color:#00ff00");
    expect(html).not.toContain("background-image");
    expect(html).not.toContain("opacity");
  });

  it("styles guest field labels for an image instead of its hidden colour", () => {
    const faint = renderToStaticMarkup(
      <SplashPage config={imageConfig} device="desktop" mode="preview" />,
    );
    expect(faint).toMatch(/<label[^>]*style="color:#ffffff;text-shadow:[^"]+"/);

    const strong = renderToStaticMarkup(
      <SplashPage
        config={{
          ...imageConfig,
          background: {
            ...imageConfig.background,
            image: {
              ...imageConfig.background.image!,
              overlay: { color: "#ffffff", opacity: 0.8 },
            },
          },
        }}
        device="desktop"
        mode="preview"
      />,
    );
    expect(strong).toMatch(/<label[^>]*style="color:#1c1917"/);
  });

  it("makes the logo selectable in edit mode", () => {
    const html = renderToStaticMarkup(
      <SplashPage
        config={imageConfig}
        device="mobile"
        mode="edit"
        selectedElementId={LOGO_ELEMENT_ID}
        onSelectElement={noop}
      />,
    );

    expect(html).toMatch(
      new RegExp(
        `<img[^>]*data-element-id="${LOGO_ELEMENT_ID}"[^>]*data-selected="true"`,
      ),
    );
  });
});
