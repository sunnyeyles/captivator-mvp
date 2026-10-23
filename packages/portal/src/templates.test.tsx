import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SplashPage } from "./renderer/splash-page";
import { devices, portalConfigSchema } from "./schema";
import { templateIds, templates } from "./templates";

describe("templates", () => {
  it("offers Minimal, Event and Corporate", () => {
    expect(templateIds.map((id) => templates[id].name)).toEqual([
      "Minimal",
      "Event",
      "Corporate",
    ]);
  });

  it.each(templateIds)("%s parses against the portal schema", (id) => {
    const result = portalConfigSchema.safeParse(templates[id].config);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(templates[id].config);
  });

  it.each(templateIds)("%s is keyed by its own id", (id) => {
    expect(templates[id].id).toBe(id);
  });

  it.each(
    templateIds.flatMap((id) => devices.map((device) => ({ id, device }))),
  )(
    "$id renders its logo, text, fields and button on $device",
    ({ id, device }) => {
      const { config } = templates[id];
      const html = renderToStaticMarkup(
        <SplashPage config={config} device={device} mode="preview" />,
      );

      expect(html).toContain(`data-device="${device}"`);
      expect(html).toContain("<img");
      for (const text of config.texts) expect(html).toContain(text.text);
      expect(html.match(/<input/g)).toHaveLength(config.fields.length);
      expect(html).toContain(config.button.label);
    },
  );

  it("gives Event a bundled background image with an overlay", () => {
    const { background } = templates.event.config;

    expect(background.type).toBe("image");
    expect(background.image?.src).toMatch(/^data:image\/svg\+xml,/);
    expect(background.image?.overlay).not.toBeNull();
  });

  it("uses no remote or object URLs for template images", () => {
    for (const id of templateIds) {
      const { branding, background } = templates[id].config;
      for (const src of [branding.logo?.src, background.image?.src]) {
        if (src) expect(src).toMatch(/^data:/);
      }
    }
  });

  it("shrinks the Event title on mobile with a preset override", () => {
    const render = (device: "desktop" | "mobile") =>
      renderToStaticMarkup(
        <SplashPage
          config={templates.event.config}
          device={device}
          mode="preview"
        />,
      );

    expect(render("desktop")).toContain("font-size:56px");
    expect(render("mobile")).toContain("font-size:40px");
  });

  it("starts Minimal from the default design with a centred logo", () => {
    const html = renderToStaticMarkup(
      <SplashPage
        config={templates.minimal.config}
        device="mobile"
        mode="preview"
      />,
    );

    expect(html).toMatch(/<img[^>]*class="[^"]*self-center/);
  });
});
