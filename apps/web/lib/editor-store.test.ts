import {
  brandedConfig,
  defaultBackgroundImageSettings,
  defaultPortalConfig,
  defaultTextStyle,
  LOGO_ELEMENT_ID,
  resolveBackgroundImage,
  templates,
  type BrandProfile,
} from "@repo/portal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GESTURE_IDLE_MS,
  hasUnsavedChanges,
  HISTORY_LIMIT,
  initialEditorState,
  isAtTemplateDefaults,
  reusableBrand,
  usePortalEditorStore,
} from "./editor-store";
import { acmeBrand } from "./test-fixtures";

const { getState } = usePortalEditorStore;

// Ends the current gesture so the next edit to the same target is its own undo step
function pause() {
  vi.advanceTimersByTime(GESTURE_IDLE_MS);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  usePortalEditorStore.setState(initialEditorState);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePortalEditorStore", () => {
  it("starts from the Minimal template in desktop mode", () => {
    expect(getState().templateId).toBe("minimal");
    expect(getState().config).toBe(templates.minimal.config);
    expect(getState().deviceMode).toBe("desktop");
  });

  it("updates the background colour", () => {
    getState().updateBackground({ color: "#0ea5e9" });

    expect(getState().config.background.color).toBe("#0ea5e9");
    expect(getState().config.texts).toEqual(defaultPortalConfig.texts);
  });

  it("ignores an invalid background colour", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    getState().updateBackground({ color: "blue-ish" });

    expect(getState().config.background.color).toBe("#0ea5e9");
  });

  it("sets the device mode", () => {
    getState().setDeviceMode("mobile");
    expect(getState().deviceMode).toBe("mobile");

    getState().setDeviceMode("tablet");
    expect(getState().deviceMode).toBe("tablet");

    getState().setDeviceMode("desktop");
    expect(getState().deviceMode).toBe("desktop");
  });

  it("keeps edits when switching device mode", () => {
    getState().updateBackground({ color: "#16a34a" });
    getState().setDeviceMode("mobile");
    getState().setDeviceMode("desktop");

    expect(getState().config.background.color).toBe("#16a34a");
  });

  it("starts in edit mode with nothing selected", () => {
    expect(getState().canvasMode).toBe("edit");
    expect(getState().selectedElementId).toBeNull();
  });

  it("selects and clears an element", () => {
    getState().selectElement("welcome-heading");
    expect(getState().selectedElementId).toBe("welcome-heading");

    getState().selectElement(null);
    expect(getState().selectedElementId).toBeNull();
  });

  it("clears the selection when entering preview", () => {
    getState().selectElement("welcome-heading");
    getState().setCanvasMode("preview");

    expect(getState().canvasMode).toBe("preview");
    expect(getState().selectedElementId).toBeNull();

    getState().setCanvasMode("edit");
    expect(getState().canvasMode).toBe("edit");
  });
});

describe("text elements", () => {
  const firstId = defaultPortalConfig.texts[0]!.id;

  it("adds a text element with the default style and selects it", () => {
    getState().addText();
    const texts = getState().config.texts;
    const added = texts.at(-1)!;

    expect(texts).toHaveLength(defaultPortalConfig.texts.length + 1);
    expect(added).toMatchObject(defaultTextStyle);
    expect(getState().selectedElementId).toBe(added.id);
  });

  it("gives every added text a unique id", () => {
    getState().addText();
    getState().addText();
    getState().removeText(getState().config.texts.at(-2)!.id);
    getState().addText();
    const ids = getState().config.texts.map((text) => text.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("updates one text element and leaves the others", () => {
    getState().updateText(firstId, {
      text: "Hi there",
      color: "#000000",
      fontSize: 64,
      fontWeight: 400,
      textAlign: "left",
    });

    expect(getState().config.texts[0]).toEqual({
      id: firstId,
      text: "Hi there",
      color: "#000000",
      fontSize: 64,
      fontWeight: 400,
      textAlign: "left",
    });
    expect(getState().config.texts.slice(1)).toEqual(
      defaultPortalConfig.texts.slice(1),
    );
  });

  it.each([
    { color: "blue-ish" },
    { fontSize: 4 },
    { fontSize: 500 },
    { fontSize: Number.NaN },
  ])("ignores an invalid update %j", (changes) => {
    getState().updateText(firstId, changes);

    expect(getState().config.texts).toEqual(defaultPortalConfig.texts);
  });

  it("ignores updates to a missing text element", () => {
    getState().updateText("missing", { text: "Nope" });

    expect(getState().config.texts).toEqual(defaultPortalConfig.texts);
  });

  it("removes a text element and clears it from the selection", () => {
    getState().selectElement(firstId);
    getState().removeText(firstId);

    expect(getState().config.texts.map((text) => text.id)).not.toContain(
      firstId,
    );
    expect(getState().selectedElementId).toBeNull();
  });

  it("keeps another element selected when removing a text", () => {
    const secondId = defaultPortalConfig.texts[1]!.id;
    getState().selectElement(secondId);
    getState().removeText(firstId);

    expect(getState().selectedElementId).toBe(secondId);
  });

  it("keeps text edits when switching device mode", () => {
    getState().updateText(firstId, { text: "Shared" });
    getState().setDeviceMode("mobile");

    expect(getState().config.texts[0]!.text).toBe("Shared");
  });
});

describe("guest fields", () => {
  function fieldTypes() {
    return getState().config.fields.map((field) => field.type);
  }

  beforeEach(() => {
    usePortalEditorStore.setState({
      config: { ...defaultPortalConfig, fields: [] },
    });
  });

  it("adds an unused field type and selects it", () => {
    getState().addField();
    getState().addField();

    expect(fieldTypes()).toEqual(["name", "email"]);
    expect(getState().selectedElementId).toBe(getState().config.fields[1]!.id);
  });

  it("never adds a third field", () => {
    getState().addField();
    getState().addField();
    getState().addField();

    expect(getState().config.fields).toHaveLength(2);
  });

  it("swaps a field's type", () => {
    getState().addField();
    const id = getState().config.fields[0]!.id;
    getState().updateField(id, { type: "phone" });

    expect(fieldTypes()).toEqual(["phone"]);
  });

  it("refuses to swap to a type another field uses", () => {
    getState().addField();
    getState().addField();
    getState().updateField(getState().config.fields[0]!.id, { type: "email" });

    expect(fieldTypes()).toEqual(["name", "email"]);
  });

  it("sets label, placeholder and required status", () => {
    getState().addField();
    const id = getState().config.fields[0]!.id;
    getState().updateField(id, {
      label: "Full name",
      placeholder: "Jane Doe",
      required: true,
    });

    expect(getState().config.fields[0]).toEqual({
      id,
      type: "name",
      label: "Full name",
      placeholder: "Jane Doe",
      required: true,
    });
  });

  it("ignores an over-long label", () => {
    getState().addField();
    const id = getState().config.fields[0]!.id;
    getState().updateField(id, { label: "a".repeat(200) });

    expect(getState().config.fields[0]!.label).toBeUndefined();
  });

  it("removes a field and clears it from the selection", () => {
    getState().addField();
    const id = getState().config.fields[0]!.id;
    getState().removeField(id);

    expect(getState().config.fields).toEqual([]);
    expect(getState().selectedElementId).toBeNull();
  });

  it("adds the removed type back after a remove", () => {
    getState().addField();
    getState().addField();
    getState().removeField(getState().config.fields[0]!.id);
    getState().addField();

    expect(fieldTypes()).toEqual(["email", "name"]);
    const ids = getState().config.fields.map((field) => field.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("reorders fields and ignores moves past either end", () => {
    getState().addField();
    getState().addField();
    const [first, second] = getState().config.fields;

    getState().moveField(second!.id, -1);
    expect(fieldTypes()).toEqual(["email", "name"]);

    getState().moveField(second!.id, -1);
    getState().moveField(first!.id, 1);
    expect(fieldTypes()).toEqual(["email", "name"]);

    getState().moveField(first!.id, -1);
    expect(fieldTypes()).toEqual(["name", "email"]);
  });

  it("keeps field edits when switching device mode", () => {
    getState().addField();
    getState().setDeviceMode("mobile");

    expect(fieldTypes()).toEqual(["name"]);
  });
});

describe("Connect button", () => {
  it("updates the button style", () => {
    getState().updateButton({
      label: "Go",
      backgroundColor: "#000000",
      textColor: "#ffffff",
      borderRadius: 0,
      width: 50,
    });

    expect(getState().config.button).toEqual({
      label: "Go",
      backgroundColor: "#000000",
      textColor: "#ffffff",
      borderRadius: 0,
      width: 50,
    });
  });

  it.each([
    { backgroundColor: "nope" },
    { textColor: "#12" },
    { borderRadius: -1 },
    { borderRadius: 100 },
    { width: 10 },
    { width: 101 },
    { width: Number.NaN },
    { label: "" },
    { label: "   " },
  ])("ignores an invalid update %j", (changes) => {
    getState().updateButton(changes);

    expect(getState().config.button).toEqual(defaultPortalConfig.button);
  });
});

describe("images", () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const logo = { src: "blob:http://localhost/logo-1", alt: "Logo" };
  const backgroundImage = {
    src: "blob:http://localhost/bg-1",
    ...defaultBackgroundImageSettings,
  };

  // The outer reset revokes the previous test's images, so start each count after it
  beforeEach(() => {
    revoke.mockClear();
  });

  it("sets, replaces and removes the logo", () => {
    getState().updateBranding({ logo });
    expect(getState().config.branding.logo).toEqual(logo);

    getState().updateBranding({
      logo: { ...logo, src: "blob:http://localhost/logo-2" },
    });
    expect(getState().config.branding.logo?.src).toBe(
      "blob:http://localhost/logo-2",
    );

    getState().updateBranding({ logo: null });
    expect(getState().config.branding.logo).toBeNull();
  });

  it("ignores a logo without a source", () => {
    getState().updateBranding({ logo: { src: "", alt: "Logo" } });

    expect(getState().config.branding.logo).toEqual(
      templates.minimal.config.branding.logo,
    );
  });

  it("clears the selection when the selected logo is removed", () => {
    getState().updateBranding({ logo });
    getState().selectElement(LOGO_ELEMENT_ID);
    getState().updateBranding({ logo: null });

    expect(getState().selectedElementId).toBeNull();
  });

  it("switches the background to an image and back to its colour", () => {
    getState().updateBackground({ type: "image", image: backgroundImage });
    expect(getState().config.background).toMatchObject({
      type: "image",
      image: backgroundImage,
    });

    getState().updateBackground({ type: "color" });
    expect(getState().config.background.type).toBe("color");
    expect(getState().config.background.color).toBe(
      defaultPortalConfig.background.color,
    );
    expect(revoke).not.toHaveBeenCalled();
  });

  it("ignores an invalid overlay", () => {
    getState().updateBackground({ type: "image", image: backgroundImage });
    getState().updateBackground({
      image: { ...backgroundImage, overlay: { color: "#000000", opacity: 2 } },
    });

    expect(getState().config.background.image?.overlay).toBeNull();
  });

  it("keeps replaced and removed images while undo can restore them", () => {
    getState().updateBackground({ type: "image", image: backgroundImage });
    getState().updateBackground({
      image: { ...backgroundImage, src: "blob:http://localhost/bg-2" },
    });
    pause();
    getState().updateBackground({ image: null });
    getState().updateBranding({ logo });
    pause();
    getState().updateBranding({ logo: null });

    expect(revoke).not.toHaveBeenCalled();
  });

  it("restores a replaced logo on undo without revoking it", () => {
    getState().updateBranding({ logo });
    pause();
    getState().updateBranding({
      logo: { ...logo, src: "blob:http://localhost/logo-2" },
    });
    getState().undo();

    expect(getState().config.branding.logo).toEqual(logo);
    expect(revoke).not.toHaveBeenCalled();

    getState().redo();
    expect(getState().config.branding.logo?.src).toBe(
      "blob:http://localhost/logo-2",
    );
    expect(revoke).not.toHaveBeenCalled();
  });

  it("revokes an image once a new edit drops it from redo", () => {
    getState().updateBackground({ type: "image", image: backgroundImage });
    getState().undo();
    expect(revoke).not.toHaveBeenCalled();

    getState().updateBackground({ color: "#0ea5e9" });
    expect(revoke).toHaveBeenCalledExactlyOnceWith(backgroundImage.src);
  });

  it("keeps an image that is still in the redo stack", () => {
    getState().updateBranding({ logo });
    getState().undo();

    expect(getState().future).toHaveLength(1);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("revokes an image once it falls off the end of history", () => {
    getState().updateBranding({ logo });
    pause();
    getState().updateBranding({ logo: null });
    for (let step = 0; step < HISTORY_LIMIT - 1; step += 1) {
      pause();
      getState().updateText("welcome-heading", { text: `Edit ${step}` });
    }
    expect(revoke).not.toHaveBeenCalled();

    pause();
    getState().updateText("welcome-heading", { text: "One more" });
    expect(getState().past).toHaveLength(HISTORY_LIMIT);
    expect(revoke).toHaveBeenCalledExactlyOnceWith(logo.src);
  });

  it("never revokes a template's bundled images", () => {
    getState().setTemplate("event");
    getState().setTemplate("corporate");
    getState().reset();
    usePortalEditorStore.setState(initialEditorState);

    expect(revoke).not.toHaveBeenCalled();
  });

  it("revokes images no longer referenced when the config is replaced", () => {
    getState().updateBranding({ logo });
    usePortalEditorStore.setState(initialEditorState);

    expect(revoke).toHaveBeenCalledExactlyOnceWith(logo.src);
  });
});

describe("templates", () => {
  it("loads the chosen template into the config", () => {
    getState().setTemplate("event");

    expect(getState().templateId).toBe("event");
    expect(getState().config).toEqual(templates.event.config);
  });

  it("edits a template like any other config", () => {
    getState().setTemplate("corporate");
    getState().updateText("corporate-heading", { text: "Hello" });
    getState().updateButton({ backgroundColor: "#000000" });

    expect(getState().config.texts[0]!.text).toBe("Hello");
    expect(getState().config.button.backgroundColor).toBe("#000000");
    expect(templates.corporate.config.texts[0]!.text).toBe("Welcome, guest");
  });

  it("keeps the selection only when the template has that element", () => {
    getState().selectElement("welcome-heading");
    getState().setTemplate("event");
    expect(getState().selectedElementId).toBeNull();

    getState().selectElement(LOGO_ELEMENT_ID);
    getState().setTemplate("corporate");
    expect(getState().selectedElementId).toBe(LOGO_ELEMENT_ID);
  });

  it("can undo a template switch", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    const edited = getState().config;
    getState().setTemplate("event");
    getState().undo();

    expect(getState().templateId).toBe("minimal");
    expect(getState().config).toBe(edited);
  });
});

describe("reset", () => {
  it("returns to the selected template's defaults", () => {
    getState().setTemplate("event");
    getState().updateText("event-title", { text: "Changed" });
    getState().updateBackground({ type: "color" });
    getState().reset();

    expect(getState().templateId).toBe("event");
    expect(getState().config).toEqual(templates.event.config);
  });

  it("can itself be undone and redone", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    getState().reset();
    getState().undo();

    expect(getState().config.background.color).toBe("#0ea5e9");

    getState().redo();
    expect(getState().config).toEqual(templates.minimal.config);
  });

  it("adds no history when nothing has changed", () => {
    getState().reset();

    expect(getState().past).toEqual([]);
  });

  it("is enabled only while the config differs from the template by value", () => {
    expect(isAtTemplateDefaults(getState())).toBe(true);

    const color = getState().config.background.color;
    getState().updateBackground({ color: "#0ea5e9" });
    expect(isAtTemplateDefaults(getState())).toBe(false);

    getState().updateBackground({ color });
    expect(getState().config).not.toBe(templates.minimal.config);
    expect(isAtTemplateDefaults(getState())).toBe(true);
  });
});

describe("no-op edits", () => {
  it.each([
    [
      "updateText",
      () => getState().updateText("welcome-heading", { fontSize: 48 }),
    ],
    ["updateText with an unknown id", () => getState().updateText("nope", {})],
    ["updateField", () => getState().updateField("field-1", {})],
    ["removeText with an unknown id", () => getState().removeText("nope")],
    ["removeField with an unknown id", () => getState().removeField("nope")],
    ["updateButton", () => getState().updateButton({})],
    ["updateBackground", () => getState().updateBackground({ type: "color" })],
    ["updateBranding", () => getState().updateBranding({})],
    [
      "setTemplate to the current template",
      () => getState().setTemplate("minimal"),
    ],
  ])("%s leaves the config and history untouched", (_name, edit) => {
    const { config } = getState();
    edit();

    expect(getState().config).toBe(config);
    expect(getState().past).toEqual([]);
  });

  it("keeps the redo stack after a no-op edit", () => {
    getState().updateBackground({ color: "#111111" });
    getState().undo();
    getState().updateButton({});

    expect(getState().future).toHaveLength(1);
  });
});

describe("undo and redo", () => {
  it("steps back and forward through config edits", () => {
    getState().updateBackground({ color: "#111111" });
    pause();
    getState().updateBackground({ color: "#222222" });
    getState().addText();

    getState().undo();
    expect(getState().config.texts).toHaveLength(2);
    getState().undo();
    expect(getState().config.background.color).toBe("#111111");
    getState().undo();
    expect(getState().config).toBe(initialEditorState.config);

    getState().redo();
    getState().redo();
    expect(getState().config.background.color).toBe("#222222");
    getState().redo();
    expect(getState().config.texts).toHaveLength(3);
  });

  it("does nothing at either end of history", () => {
    getState().undo();
    getState().redo();

    expect(getState().config).toBe(initialEditorState.config);
    expect(getState().past).toEqual([]);
    expect(getState().future).toEqual([]);
  });

  it("drops the redo stack after a new edit", () => {
    getState().updateBackground({ color: "#111111" });
    getState().undo();
    getState().updateBackground({ color: "#333333" });
    getState().redo();

    expect(getState().future).toEqual([]);
    expect(getState().config.background.color).toBe("#333333");
  });

  it("records nothing for device, canvas mode or selection changes", () => {
    getState().setDeviceMode("mobile");
    getState().setCanvasMode("preview");
    getState().setCanvasMode("edit");
    getState().selectElement("welcome-heading");

    expect(getState().past).toEqual([]);
  });

  it("records nothing for an ignored invalid edit", () => {
    getState().updateBackground({ color: "nope" });
    getState().updateButton({ width: 1 });

    expect(getState().past).toEqual([]);
  });

  it("leaves device, canvas mode and selection alone", () => {
    getState().updateBackground({ color: "#111111" });
    getState().setDeviceMode("mobile");
    getState().selectElement("welcome-subheading");
    getState().undo();

    expect(getState().deviceMode).toBe("mobile");
    expect(getState().canvasMode).toBe("edit");
    expect(getState().selectedElementId).toBe("welcome-subheading");

    getState().setCanvasMode("preview");
    getState().redo();
    expect(getState().canvasMode).toBe("preview");
    expect(getState().config.background.color).toBe("#111111");
  });

  it("clears a selection the restored config no longer has", () => {
    getState().addText();
    const id = getState().selectedElementId;
    expect(id).not.toBeNull();

    getState().undo();
    expect(getState().selectedElementId).toBeNull();
  });

  it("keeps at most the history limit", () => {
    for (let step = 0; step < HISTORY_LIMIT + 5; step += 1) {
      pause();
      getState().updateText("welcome-heading", { text: `Edit ${step}` });
    }

    expect(getState().past).toHaveLength(HISTORY_LIMIT);
  });
});

describe("gestures", () => {
  it("records a 50-event slider drag as one undo step", () => {
    getState().updateButton({ width: 50 });
    pause();
    for (let width = 51; width <= 100; width += 1) {
      getState().updateButton({ width });
    }

    expect(getState().past).toHaveLength(2);
    expect(getState().config.button.width).toBe(100);

    getState().undo();
    expect(getState().config.button.width).toBe(50);
  });

  it("records typing a word as one undo step", () => {
    for (const text of ["H", "He", "Hel", "Hell", "Hello"]) {
      getState().updateText("welcome-heading", { text });
    }

    expect(getState().past).toHaveLength(1);
    getState().undo();
    expect(getState().config).toBe(initialEditorState.config);
  });

  it("records a different edit afterwards as a separate step", () => {
    getState().updateText("welcome-heading", { text: "Hi" });
    getState().updateText("welcome-heading", { text: "Hiya" });
    getState().updateText("welcome-heading", { color: "#ff0000" });
    getState().updateText("welcome-subheading", { text: "Sub" });

    expect(getState().past).toHaveLength(3);
    getState().undo();
    getState().undo();
    expect(getState().config.texts[0]!.text).toBe("Hiya");
  });

  it("starts a new step after a selection change or an undo", () => {
    getState().updateBackground({ color: "#111111" });
    getState().selectElement("welcome-heading");
    getState().updateBackground({ color: "#222222" });
    expect(getState().past).toHaveLength(2);

    getState().undo();
    getState().updateBackground({ color: "#333333" });
    expect(getState().past).toHaveLength(2);
    expect(getState().past[1]!.config.background.color).toBe("#111111");
  });

  it("drops the step when a drag ends where it began", () => {
    const { width } = getState().config.button;
    getState().updateButton({ width: 70 });
    getState().updateButton({ width });

    expect(getState().past).toEqual([]);
  });

  it("keeps an image upload and a quick fit change as separate steps", () => {
    const image = {
      src: "blob:http://localhost/bg-gesture",
      ...defaultBackgroundImageSettings,
    };
    getState().updateBackground({ type: "image", image });
    getState().updateBackground({ image: { ...image, fit: "contain" } });

    expect(getState().past).toHaveLength(2);
    getState().undo();
    expect(getState().config.background.image?.src).toBe(image.src);
    expect(getState().config.background.image?.fit).toBe(image.fit);
  });

  it("does not push older entries off history during a drag", () => {
    getState().setTemplate("event");
    for (let step = 0; step < HISTORY_LIMIT * 2; step += 1) {
      getState().updateBackground({ color: step % 2 ? "#111111" : "#222222" });
    }

    expect(getState().past).toHaveLength(2);
    expect(getState().past[0]!.templateId).toBe("minimal");
  });
});

describe("edits with device overrides", () => {
  const text = () => getState().config.texts[0]!;
  const field = () => getState().config.fields[0]!;
  const logo = () => getState().config.branding.logo!;

  // Templates and brand fitting ship overrides, which the editor no longer creates itself
  beforeEach(() => {
    const { config } = initialEditorState;
    usePortalEditorStore.setState({
      config: {
        ...config,
        texts: config.texts.map((current, index) =>
          index === 0
            ? {
                ...current,
                overrides: {
                  mobile: { fontSize: 24, textAlign: "left" },
                  tablet: { fontSize: 32 },
                },
              }
            : current,
        ),
        fields: config.fields.map((current) => ({
          ...current,
          overrides: { mobile: { width: 50 } },
        })),
        button: { ...config.button, overrides: { mobile: { width: 60 } } },
        branding: {
          ...config.branding,
          logo: {
            ...config.branding.logo!,
            overrides: { tablet: { maxHeight: 48, spaceAbove: 8 } },
          },
        },
      },
    });
  });

  it("clears the edited text style on every device and keeps the others", () => {
    getState().updateText(text().id, { fontSize: 56 });

    expect(text().fontSize).toBe(56);
    expect(text().overrides).toEqual({ mobile: { textAlign: "left" } });
  });

  it("keeps overrides when editing a property that has none", () => {
    getState().updateText(text().id, { text: "Hello" });

    expect(text().overrides).toEqual({
      mobile: { fontSize: 24, textAlign: "left" },
      tablet: { fontSize: 32 },
    });
  });

  it("clears a field's width overrides on edit", () => {
    getState().updateField(field().id, { width: 80 });

    expect(field().width).toBe(80);
    expect(field().overrides).toBeUndefined();
  });

  it("clears the button's width overrides on edit", () => {
    getState().updateButton({ width: 90 });

    expect(getState().config.button.width).toBe(90);
    expect(getState().config.button.overrides).toBeUndefined();
  });

  it("clears only the edited logo override", () => {
    getState().updateLogo({ maxHeight: 120 });

    expect(logo().maxHeight).toBe(120);
    expect(logo().overrides).toEqual({ tablet: { spaceAbove: 8 } });
  });

  it("ignores an invalid logo edit", () => {
    const before = logo();
    getState().updateLogo({ maxHeight: 1 });

    expect(logo()).toBe(before);
  });

  it("ignores a logo edit when there is no logo", () => {
    getState().updateBranding({ logo: null });
    getState().updateLogo({ maxHeight: 120 });

    expect(getState().config.branding.logo).toBeNull();
  });

  it("restores the cleared overrides on undo", () => {
    getState().updateButton({ width: 90 });
    getState().undo();

    expect(getState().config.button.overrides).toEqual({
      mobile: { width: 60 },
    });
  });

  it("replaces overrides with the template's on a template switch", () => {
    getState().setTemplate("event");

    expect(getState().config).toBe(templates.event.config);
    expect(getState().config.button.overrides).toBeUndefined();
    expect(getState().config.texts[0]!.overrides).toEqual({
      mobile: { fontSize: 40 },
    });
  });
});

describe("loading a design", () => {
  it("replaces the design and starts undo history fresh", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    getState().updateBackground({ color: "#16a34a" });
    getState().undo();
    getState().selectElement("welcome-heading");

    getState().loadDesign({
      config: templates.event.config,
      templateId: "event",
      brand: null,
    });

    expect(getState().config).toBe(templates.event.config);
    expect(getState().templateId).toBe("event");
    expect(getState().past).toEqual([]);
    expect(getState().future).toEqual([]);
    expect(getState().selectedElementId).toBeNull();
    expect(getState().saved).toEqual({
      config: templates.event.config,
      templateId: "event",
      brand: null,
    });
    expect(hasUnsavedChanges(getState())).toBe(false);
  });

  it("never undoes back into the previous design", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    getState().loadDesign({
      config: templates.corporate.config,
      templateId: "corporate",
      brand: null,
    });

    getState().undo();

    expect(getState().config).toBe(templates.corporate.config);
  });

  it("restores the design's brand and drops the previous draft", () => {
    const brand = acmeBrand;
    getState().setBrandDraft({ ...brand, name: "Bean There" });

    getState().loadDesign({
      config: brandedConfig("minimal", brand),
      templateId: "minimal",
      brand,
    });

    expect(getState().brand).toBe(brand);
    expect(getState().brandDraft).toBeNull();
    expect(hasUnsavedChanges(getState())).toBe(false);

    getState().setTemplate("corporate");
    expect(getState().config).toEqual(brandedConfig("corporate", brand));
  });
});

describe("unsaved changes", () => {
  beforeEach(() => {
    getState().loadDesign({
      config: templates.minimal.config,
      templateId: "minimal",
      brand: null,
    });
  });

  it("turns on after an edit", () => {
    getState().updateBackground({ color: "#0ea5e9" });

    expect(hasUnsavedChanges(getState())).toBe(true);
  });

  it("turns on after a template change", () => {
    getState().setTemplate("event");

    expect(hasUnsavedChanges(getState())).toBe(true);
  });

  it("turns off after undoing back to the saved state", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    getState().undo();

    expect(hasUnsavedChanges(getState())).toBe(false);
  });

  it("turns off once the current state is marked saved", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    const { config, templateId, brand } = getState();
    getState().markSaved({ config, templateId, brand });

    expect(hasUnsavedChanges(getState())).toBe(false);

    getState().undo();
    expect(hasUnsavedChanges(getState())).toBe(true);
  });

  it("stays on for edits made after the saved snapshot was taken", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    const { config, templateId, brand } = getState();
    pause();
    getState().updateBackground({ color: "#16a34a" });
    getState().markSaved({ config, templateId, brand });

    expect(hasUnsavedChanges(getState())).toBe(true);
  });
});

describe("background positions", () => {
  const recommended = {
    desktop: { x: 30, y: 40 },
    tablet: { x: 50, y: 60 },
    mobile: { x: 70, y: 80 },
  };
  const image = () => getState().config.background.image!;
  const positionOn = (device: "desktop" | "tablet" | "mobile") =>
    resolveBackgroundImage(image(), device).position;

  function placeImage() {
    getState().updateBackground({ type: "image" });
    getState().placeBackgroundImage("blob:http://localhost/bg-1", recommended);
    pause();
  }

  it("places an image with its recommendation in one undo step", () => {
    getState().updateBackground({ type: "image" });
    pause();
    const before = getState().config;
    getState().placeBackgroundImage("blob:http://localhost/bg-1", recommended);

    expect(image()).toEqual({
      ...defaultBackgroundImageSettings,
      src: "blob:http://localhost/bg-1",
      recommended,
    });

    getState().undo();
    expect(getState().config).toBe(before);
  });

  it("keeps fit and overlay and drops old adjustments when replacing", () => {
    placeImage();
    getState().updateBackground({
      image: {
        ...image(),
        fit: "contain",
        overlay: { color: "#ff0000", opacity: 0.5 },
      },
    });
    getState().overrideBackgroundPosition("mobile", { x: 1, y: 2 });
    pause();
    getState().placeBackgroundImage("blob:http://localhost/bg-2", null);

    expect(image()).toEqual({
      src: "blob:http://localhost/bg-2",
      fit: "contain",
      position: { x: 50, y: 50 },
      recommended: null,
      overlay: { color: "#ff0000", opacity: 0.5 },
    });
  });

  it("starts the Event template's replacement image centred", () => {
    getState().setTemplate("event");
    getState().placeBackgroundImage("blob:http://localhost/bg-1", null);

    expect(image()).toMatchObject({
      fit: "cover",
      position: { x: 50, y: 50 },
      recommended: null,
      overlay: templates.event.config.background.image!.overlay,
    });
  });

  it("overrides one device and leaves the others alone", () => {
    placeImage();
    getState().overrideBackgroundPosition("mobile", { x: 12.5, y: 0 });

    expect(positionOn("mobile")).toEqual({ x: 12.5, y: 0 });
    expect(positionOn("desktop")).toEqual(recommended.desktop);
    expect(positionOn("tablet")).toEqual(recommended.tablet);
  });

  it("rejects an invalid position", () => {
    placeImage();
    const before = getState().config;
    getState().overrideBackgroundPosition("mobile", { x: 120, y: 50 });
    getState().overrideBackgroundPosition("mobile", { x: Number.NaN, y: 50 });

    expect(getState().config).toBe(before);
  });

  it("ignores a position override without an image", () => {
    const before = getState().config;
    getState().overrideBackgroundPosition("desktop", { x: 10, y: 10 });

    expect(getState().config).toBe(before);
  });

  it("merges a drag into one undo step", () => {
    placeImage();
    const before = getState().config;
    for (let x = 49; x > 40; x -= 1) {
      getState().overrideBackgroundPosition("desktop", { x, y: 50 });
      vi.advanceTimersByTime(16);
    }

    expect(positionOn("desktop")).toEqual({ x: 41, y: 50 });
    getState().undo();
    expect(getState().config).toBe(before);
  });

  it("starts a new undo step on another device", () => {
    placeImage();
    getState().overrideBackgroundPosition("desktop", { x: 10, y: 50 });
    getState().overrideBackgroundPosition("mobile", { x: 20, y: 50 });
    getState().undo();

    expect(positionOn("desktop")).toEqual({ x: 10, y: 50 });
    expect(positionOn("mobile")).toEqual(recommended.mobile);
  });

  it("resets a device to its recommendation", () => {
    placeImage();
    getState().overrideBackgroundPosition("tablet", { x: 1, y: 1 });
    getState().overrideBackgroundPosition("mobile", { x: 2, y: 2 });
    pause();
    getState().clearBackgroundPositionOverride("tablet");

    expect(positionOn("tablet")).toEqual(recommended.tablet);
    expect(positionOn("mobile")).toEqual({ x: 2, y: 2 });
  });

  it("resets to the shared position without a recommendation", () => {
    getState().updateBackground({ type: "image" });
    getState().placeBackgroundImage("blob:http://localhost/bg-1", null);
    getState().overrideBackgroundPosition("desktop", { x: 1, y: 1 });
    pause();
    getState().clearBackgroundPositionOverride("desktop");

    expect(positionOn("desktop")).toEqual({ x: 50, y: 50 });
    expect(image().overrides).toBeUndefined();
  });

  it("keeps every device's position when switching device", () => {
    placeImage();
    getState().overrideBackgroundPosition("mobile", { x: 3, y: 4 });
    const { config } = getState();
    getState().setDeviceMode("mobile");
    getState().setDeviceMode("tablet");

    expect(getState().config).toBe(config);
    expect(positionOn("mobile")).toEqual({ x: 3, y: 4 });
  });

  it("restores positions exactly on undo and redo", () => {
    placeImage();
    getState().overrideBackgroundPosition("mobile", { x: 3.7, y: 4.2 });
    getState().undo();
    expect(positionOn("mobile")).toEqual(recommended.mobile);

    getState().redo();
    expect(positionOn("mobile")).toEqual({ x: 3.7, y: 4.2 });
  });

  it("replaces positions with the template's on a template switch and reset", () => {
    placeImage();
    getState().overrideBackgroundPosition("mobile", { x: 3, y: 4 });
    getState().setTemplate("event");
    expect(getState().config).toEqual(templates.event.config);

    getState().overrideBackgroundPosition("mobile", { x: 3, y: 4 });
    getState().reset();
    expect(getState().config).toEqual(templates.event.config);
  });
});

describe("repositioning", () => {
  function placeImage() {
    getState().updateBackground({ type: "image" });
    getState().placeBackgroundImage("blob:http://localhost/bg-1", null);
  }

  it("is editor state outside history", () => {
    placeImage();
    const { past } = getState();
    getState().setRepositioning(true);

    expect(getState().repositioning).toBe(true);
    expect(getState().past).toBe(past);
  });

  it("clears the selection when entering", () => {
    placeImage();
    getState().selectElement("welcome-heading");
    getState().setRepositioning(true);

    expect(getState().selectedElementId).toBeNull();
  });

  it("leaves on Done", () => {
    placeImage();
    getState().setRepositioning(true);
    getState().setRepositioning(false);

    expect(getState().repositioning).toBe(false);
  });

  it("leaves when switching to preview", () => {
    placeImage();
    getState().setRepositioning(true);
    getState().setCanvasMode("preview");

    expect(getState().repositioning).toBe(false);
  });

  it("leaves when the image is removed", () => {
    placeImage();
    getState().setRepositioning(true);
    getState().updateBackground({ image: null });

    expect(getState().repositioning).toBe(false);
  });

  it("leaves when the background switches to colour", () => {
    placeImage();
    getState().setRepositioning(true);
    getState().updateBackground({ type: "color" });

    expect(getState().repositioning).toBe(false);
  });

  it("stays on through device switches and other background edits", () => {
    placeImage();
    getState().setRepositioning(true);
    getState().setDeviceMode("mobile");
    getState().updateBackground({ color: "#0ea5e9" });
    getState().overrideBackgroundPosition("mobile", { x: 1, y: 1 });

    expect(getState().repositioning).toBe(true);
  });
});

describe("branded designs", () => {
  const brand = acmeBrand;
  const otherBrand: BrandProfile = { ...brand, name: "Bean There" };

  it("starts with no brand and no draft", () => {
    expect(getState().brand).toBeNull();
    expect(getState().brandDraft).toBeNull();
  });

  it("applies a branded design as one undo step", () => {
    getState().applyBrandedDesign("event", brand);

    expect(getState().config).toEqual(brandedConfig("event", brand));
    expect(getState().templateId).toBe("event");
    expect(getState().brand).toBe(brand);
    expect(getState().past).toHaveLength(1);

    getState().undo();
    expect(getState().config).toBe(templates.minimal.config);
    expect(getState().templateId).toBe("minimal");
    expect(getState().brand).toBeNull();
  });

  it("restores the brand on undo and redo", () => {
    getState().applyBrandedDesign("minimal", brand);
    getState().applyBrandedDesign("corporate", otherBrand);
    getState().undo();

    expect(getState().brand).toBe(brand);
    expect(getState().config).toEqual(brandedConfig("minimal", brand));

    getState().redo();
    expect(getState().brand).toBe(otherBrand);
    expect(getState().templateId).toBe("corporate");
  });

  it("ignores applying the design that is already applied", () => {
    getState().applyBrandedDesign("event", brand);
    getState().applyBrandedDesign("event", { ...brand });

    expect(getState().past).toHaveLength(1);
  });

  it("keeps a selection that still exists in the branded design", () => {
    getState().selectElement("welcome-heading");
    getState().applyBrandedDesign("minimal", brand);
    expect(getState().selectedElementId).toBe("welcome-heading");

    getState().applyBrandedDesign("event", brand);
    expect(getState().selectedElementId).toBeNull();
  });

  it("keeps the brand when switching template", () => {
    getState().applyBrandedDesign("minimal", brand);
    getState().setTemplate("corporate");

    expect(getState().config).toEqual(brandedConfig("corporate", brand));
    expect(getState().brand).toBe(brand);
  });

  it("resets to the branded version of the template", () => {
    getState().applyBrandedDesign("event", brand);
    getState().updateBackground({ color: "#0ea5e9" });
    getState().reset();

    expect(getState().config).toEqual(brandedConfig("event", brand));
  });

  it("compares template defaults against the branded design", () => {
    getState().applyBrandedDesign("corporate", brand);
    expect(isAtTemplateDefaults(getState())).toBe(true);

    getState().updateButton({ label: "Join" });
    expect(isAtTemplateDefaults(getState())).toBe(false);
  });

  it("never changes the design or history from the draft", () => {
    getState().updateBackground({ color: "#0ea5e9" });
    const { config, past, future } = getState();

    getState().setBrandDraft(brand);
    getState().setBrandDraft({ ...brand, primaryColor: "#123456" });

    expect(getState().brandDraft?.primaryColor).toBe("#123456");
    expect(getState().config).toBe(config);
    expect(getState().past).toBe(past);
    expect(getState().future).toBe(future);
    expect(getState().brand).toBeNull();
  });

  it("keeps the draft through undo and redo", () => {
    getState().setBrandDraft(brand);
    getState().applyBrandedDesign("event", brand);
    getState().undo();

    expect(getState().brandDraft).toBe(brand);
  });

  it("changes the draft's brand colour without touching the design or history", () => {
    getState().applyBrandedDesign("minimal", brand);
    getState().setBrandDraft({ ...brand, colors: ["#1d4ed8"] });
    const { config, past, future } = getState();

    getState().setBrandDraftColor("#e11d48");

    expect(getState().brandDraft?.primaryColor).toBe("#e11d48");
    expect(getState().brandDraft?.colors).toEqual(["#1d4ed8"]);
    expect(getState().config).toBe(config);
    expect(getState().past).toBe(past);
    expect(getState().future).toBe(future);
    expect(getState().brand).toBe(brand);
  });

  it("ignores an invalid draft colour or a missing draft", () => {
    getState().setBrandDraftColor("#e11d48");
    expect(getState().brandDraft).toBeNull();

    getState().setBrandDraft(brand);
    getState().setBrandDraftColor("red");
    expect(getState().brandDraft).toBe(brand);
  });

  it("reuses the draft before the applied brand", () => {
    const draft = { ...otherBrand, sourceUrl: "https://bean.example/" };
    expect(reusableBrand(getState())).toBeNull();

    getState().applyBrandedDesign("event", brand);
    expect(reusableBrand(getState())).toBe(brand);

    getState().setBrandDraft(draft);
    expect(reusableBrand(getState())).toBe(draft);
  });

  it("reuses only a brand read from the same address", () => {
    const draft = { ...otherBrand, sourceUrl: "https://bean.example/" };
    getState().applyBrandedDesign("event", brand);
    getState().setBrandDraft(draft);

    expect(reusableBrand(getState(), "https://acme.example/")).toBe(brand);
    expect(reusableBrand(getState(), "https://bean.example/")).toBe(draft);
    expect(reusableBrand(getState(), "https://other.example/")).toBeNull();
  });

  it("positions the imported Event image by its recommendation and resets to it", () => {
    const recommended = {
      desktop: { x: 50, y: 30 },
      tablet: { x: 40, y: 50 },
      mobile: { x: 72.5, y: 50 },
    };
    getState().applyBrandedDesign("event", {
      ...brand,
      image: "data:image/png;base64,AAAA",
      imageRecommended: recommended,
    });
    const image = () => {
      const current = getState().config.background.image;
      if (!current) throw new Error("Expected a background image");
      return current;
    };

    for (const device of ["desktop", "tablet", "mobile"] as const) {
      expect(resolveBackgroundImage(image(), device).position).toEqual(
        recommended[device],
      );
    }

    getState().overrideBackgroundPosition("mobile", { x: 5, y: 5 });
    expect(resolveBackgroundImage(image(), "mobile").position).toEqual({
      x: 5,
      y: 5,
    });

    getState().clearBackgroundPositionOverride("mobile");
    expect(resolveBackgroundImage(image(), "mobile").position).toEqual(
      recommended.mobile,
    );
  });

  it("centres the imported Event image without a recommendation", () => {
    getState().applyBrandedDesign("event", {
      ...brand,
      image: "data:image/png;base64,AAAA",
    });
    const image = getState().config.background.image;

    expect(image && resolveBackgroundImage(image, "mobile").position).toEqual({
      x: 50,
      y: 50,
    });
  });

  it("leaves the design alone when a refresh replaces the draft", () => {
    getState().applyBrandedDesign("corporate", brand);
    getState().updateButton({ label: "Join" });
    const { config, past } = getState();

    getState().setBrandDraft({ ...brand, primaryColor: "#1d4ed8" });

    expect(getState().config).toBe(config);
    expect(getState().past).toBe(past);
    expect(getState().brand).toBe(brand);
  });
});
