import {
  defaultBackgroundImageSettings,
  defaultPortalConfig,
  defaultTextStyle,
  LOGO_ELEMENT_ID,
  templates,
} from "@repo/portal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GESTURE_IDLE_MS,
  HISTORY_LIMIT,
  initialEditorState,
  isAtTemplateDefaults,
  usePortalEditorStore,
} from "./editor-store";

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
    ["setTemplate to the current template", () => getState().setTemplate("minimal")],
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

describe("device overrides", () => {
  const firstId = defaultPortalConfig.texts[0]!.id;
  const first = () => getState().config.texts[0]!;

  it("overrides a style for one device without changing the shared value", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 24 });

    expect(first().fontSize).toBe(defaultPortalConfig.texts[0]!.fontSize);
    expect(first().overrides).toEqual({ mobile: { fontSize: 24 } });
  });

  it("ignores an invalid override", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 4 });

    expect(getState().config.texts).toEqual(defaultPortalConfig.texts);
  });

  it("clears an override back to the shared value", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 24 });
    getState().clearTextOverride(firstId, "mobile", "fontSize");

    expect(getState().config.texts).toEqual(defaultPortalConfig.texts);
  });

  it("keeps overrides when a shared edit is made", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 24 });
    getState().updateText(firstId, { fontSize: 64, textAlign: "left" });

    expect(first()).toMatchObject({
      fontSize: 64,
      textAlign: "left",
      overrides: { mobile: { fontSize: 24 } },
    });
  });

  it("keeps every override when switching device mode", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 24 });
    getState().overrideText(firstId, "desktop", { textAlign: "left" });
    getState().setDeviceMode("mobile");
    getState().setDeviceMode("desktop");
    getState().setDeviceMode("mobile");

    expect(first().overrides).toEqual({
      mobile: { fontSize: 24 },
      desktop: { textAlign: "left" },
    });
  });

  it("undoes and redoes an override edit", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 24 });
    getState().undo();

    expect(first().overrides).toBeUndefined();

    getState().redo();
    expect(first().overrides).toEqual({ mobile: { fontSize: 24 } });
  });

  it("undoes clearing an override", () => {
    getState().overrideText(firstId, "mobile", { fontSize: 24 });
    getState().clearTextOverride(firstId, "mobile", "fontSize");
    getState().undo();

    expect(first().overrides).toEqual({ mobile: { fontSize: 24 } });
  });

  it("records an override slider drag as one undo step", () => {
    for (let fontSize = 20; fontSize <= 40; fontSize += 1) {
      getState().overrideText(firstId, "mobile", { fontSize });
    }

    expect(getState().past).toHaveLength(1);
    getState().undo();
    expect(first().overrides).toBeUndefined();
  });

  it("records nothing when clearing an override that is not set", () => {
    getState().clearTextOverride(firstId, "mobile", "fontSize");

    expect(getState().past).toEqual([]);
  });
});

describe("layout overrides on fields, the button and the logo", () => {
  const fieldId = defaultPortalConfig.fields[0]!.id;
  const field = () => getState().config.fields[0]!;
  const logo = () => getState().config.branding.logo!;

  it("overrides a field's width for one device", () => {
    getState().updateField(fieldId, { width: 80 });
    getState().overrideField(fieldId, "mobile", { width: 50 });

    expect(field()).toMatchObject({
      width: 80,
      overrides: { mobile: { width: 50 } },
    });
  });

  it("clears a field override back to the shared value", () => {
    getState().overrideField(fieldId, "tablet", { spaceAbove: 16 });
    getState().clearFieldOverride(fieldId, "tablet", "spaceAbove");

    expect(field()).toEqual(defaultPortalConfig.fields[0]);
  });

  it("ignores an invalid field override", () => {
    getState().overrideField(fieldId, "mobile", { width: 10 });

    expect(getState().config.fields).toEqual(defaultPortalConfig.fields);
  });

  it("overrides the button's width and spacing for one device", () => {
    getState().overrideButton("mobile", { width: 60, spaceAbove: 8 });
    getState().updateButton({ width: 90 });

    expect(getState().config.button).toMatchObject({
      width: 90,
      overrides: { mobile: { width: 60, spaceAbove: 8 } },
    });
  });

  it("clears a button override and undoes the clear", () => {
    getState().overrideButton("mobile", { width: 60 });
    getState().clearButtonOverride("mobile", "width");

    expect(getState().config.button).toEqual(defaultPortalConfig.button);

    getState().undo();
    expect(getState().config.button.overrides).toEqual({
      mobile: { width: 60 },
    });
  });

  it("ignores an invalid button override", () => {
    getState().overrideButton("mobile", { width: 101 });

    expect(getState().config.button).toEqual(defaultPortalConfig.button);
  });

  it("overrides the logo's size for one device and keeps it on replace", () => {
    getState().overrideLogo("mobile", { maxHeight: 48 });
    getState().updateBranding({
      logo: { ...logo(), src: "blob:http://localhost/logo-2" },
    });

    expect(logo()).toMatchObject({
      src: "blob:http://localhost/logo-2",
      overrides: { mobile: { maxHeight: 48 } },
    });
  });

  it("clears a logo override back to the shared value", () => {
    const before = logo();
    getState().overrideLogo("tablet", { spaceAbove: 12 });
    getState().clearLogoOverride("tablet", "spaceAbove");

    expect(logo()).toEqual(before);
  });

  it("ignores a logo override when there is no logo", () => {
    getState().updateBranding({ logo: null });
    getState().overrideLogo("mobile", { maxHeight: 48 });

    expect(getState().config.branding.logo).toBeNull();
  });

  it("keeps every element's overrides when switching device mode", () => {
    getState().overrideField(fieldId, "mobile", { width: 50 });
    getState().overrideButton("tablet", { spaceAbove: 8 });
    getState().overrideLogo("desktop", { maxHeight: 140 });
    getState().setDeviceMode("mobile");
    getState().setDeviceMode("tablet");

    expect(field().overrides).toEqual({ mobile: { width: 50 } });
    expect(getState().config.button.overrides).toEqual({
      tablet: { spaceAbove: 8 },
    });
    expect(logo().overrides).toEqual({ desktop: { maxHeight: 140 } });
  });

  it("undoes and redoes a button override edit", () => {
    getState().overrideButton("mobile", { width: 60 });
    getState().undo();

    expect(getState().config.button.overrides).toBeUndefined();

    getState().redo();
    expect(getState().config.button.overrides).toEqual({
      mobile: { width: 60 },
    });
  });

  it("replaces overrides with the template's on a template switch", () => {
    getState().overrideButton("mobile", { width: 60 });
    getState().setTemplate("event");

    expect(getState().config).toBe(templates.event.config);
    expect(getState().config.button.overrides).toBeUndefined();
    expect(getState().config.texts[0]!.overrides).toEqual({
      mobile: { fontSize: 40 },
    });
  });
});
