import {
  backgroundImageSchema,
  backgroundSchema,
  brandedConfig,
  brandingSchema,
  buttonSchema,
  clearDeviceOverride,
  clearOverridesFor,
  colorSchema,
  defaultBackgroundImageSettings,
  defaultTextStyle,
  guestFieldTypes,
  LOGO_ELEMENT_ID,
  logoSchema,
  portalConfigSchema,
  setDeviceOverride,
  templates,
  textElementSchema,
  type BackgroundImage,
  type BackgroundPosition,
  type BackgroundPositionRecommendation,
  type BrandProfile,
  type ConnectButton,
  type Device,
  type GuestField,
  type Logo,
  type PortalConfig,
  type RenderMode,
  type StyleOverride,
  type TemplateId,
  type TextElement,
} from "@repo/portal";
import type { z } from "zod";
import { create } from "zustand";
import type { DesignContent } from "./designs";
import { isDeepEqual, isPlainRecord } from "./equal";
import { revokeUnreachableImageUrls } from "./images";
import { findSelectedElement } from "./selected-element";

type CanvasMode = Exclude<RenderMode, "published">;

// Only the design is history, so undo never changes device, canvas mode or selection
type HistoryEntry = DesignContent;

interface PortalEditorState extends HistoryEntry {
  past: HistoryEntry[];
  future: HistoryEntry[];
  deviceMode: Device;
  canvasMode: CanvasMode;
  selectedElementId: string | null;
  saved: HistoryEntry;
  repositioning: boolean;
  // The latest import while the customer is choosing a design, kept out of history because it never changes the design
  brandDraft: BrandProfile | null;
  // The design before an agent reply started streaming, which the finished reply becomes one undo step on top of
  generationBase: HistoryEntry | null;
}

interface PortalEditorActions {
  loadDesign: (design: HistoryEntry) => void;
  markSaved: (entry: HistoryEntry) => void;
  setTemplate: (id: TemplateId) => void;
  applyBrandedDesign: (templateId: TemplateId, brand: BrandProfile) => void;
  setBrandDraft: (brand: BrandProfile | null) => void;
  setBrandDraftColor: (color: string) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  setDeviceMode: (mode: Device) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  selectElement: (id: string | null) => void;
  updateBackground: (changes: Partial<PortalConfig["background"]>) => void;
  updateBranding: (changes: Partial<PortalConfig["branding"]>) => void;
  addText: () => void;
  // Element edits apply on every device, so they clear the changed keys' device overrides
  updateText: (id: string, changes: Partial<Omit<TextElement, "id">>) => void;
  removeText: (id: string) => void;
  addField: () => void;
  updateField: (id: string, changes: Partial<Omit<GuestField, "id">>) => void;
  removeField: (id: string) => void;
  moveField: (id: string, offset: -1 | 1) => void;
  updateButton: (changes: Partial<PortalConfig["button"]>) => void;
  updateLogo: (changes: StyleOverride<Logo>) => void;
  placeBackgroundImage: (
    src: string,
    recommended: BackgroundPositionRecommendation | null,
  ) => void;
  overrideBackgroundPosition: (
    device: Device,
    position: BackgroundPosition,
  ) => void;
  clearBackgroundPositionOverride: (device: Device) => void;
  setRepositioning: (on: boolean) => void;
  previewGeneratedConfig: (config: PortalConfig) => void;
  finishGeneration: (config: PortalConfig | null) => void;
}

type PortalEditorStore = PortalEditorState & PortalEditorActions;

export const HISTORY_LIMIT = 100;

export const initialEditorState: PortalEditorState = {
  config: templates.minimal.config,
  templateId: "minimal",
  brand: null,
  past: [],
  future: [],
  deviceMode: "desktop",
  canvasMode: "edit",
  selectedElementId: null,
  saved: {
    config: templates.minimal.config,
    templateId: "minimal",
    brand: null,
  },
  repositioning: false,
  brandDraft: null,
  generationBase: null,
};

// Gesture id for background position overrides, which have no selectable element
const BACKGROUND_IMAGE_ID = "background-image";

function nextId(prefix: string, items: { id: string }[]) {
  const taken = new Set(items.map((item) => item.id));
  let index = items.length + 1;
  while (taken.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

// Every field change goes through the full list schema so the two-field and unique-type limits always hold
function withFields(state: PortalEditorState, fields: GuestField[]) {
  const parsed = portalConfigSchema.shape.fields.safeParse(fields);
  if (!parsed.success) return null;
  return { ...state.config, fields: parsed.data };
}

// The renderer trusts the config, so an edit only lands if the result still passes the schema
function parsedInto<T>(
  state: PortalEditorState,
  schema: z.ZodType<T>,
  value: unknown,
  put: (parsed: T) => PortalConfig,
): Partial<PortalEditorState> {
  const parsed = schema.safeParse(value);
  return parsed.success ? { config: put(parsed.data) } : state;
}

function replaceText(
  state: PortalEditorState,
  id: string,
  edit: (current: TextElement) => unknown,
): Partial<PortalEditorState> {
  const current = state.config.texts.find((text) => text.id === id);
  if (!current) return state;
  return parsedInto(state, textElementSchema, edit(current), (edited) => ({
    ...state.config,
    texts: state.config.texts.map((text) => (text.id === id ? edited : text)),
  }));
}

function replaceField(
  state: PortalEditorState,
  id: string,
  edit: (current: GuestField) => GuestField,
): Partial<PortalEditorState> {
  const config = withFields(
    state,
    state.config.fields.map((field) => (field.id === id ? edit(field) : field)),
  );
  return config ? { config } : state;
}

function replaceButton(
  state: PortalEditorState,
  edit: (current: ConnectButton) => unknown,
): Partial<PortalEditorState> {
  return parsedInto(
    state,
    buttonSchema,
    edit(state.config.button),
    (button) => ({
      ...state.config,
      button,
    }),
  );
}

function replaceLogo(
  state: PortalEditorState,
  edit: (current: Logo) => unknown,
): Partial<PortalEditorState> {
  const { logo } = state.config.branding;
  if (!logo) return state;
  return parsedInto(state, logoSchema, edit(logo), (edited) => ({
    ...state.config,
    branding: { ...state.config.branding, logo: edited },
  }));
}

function replaceBackgroundImage(
  state: PortalEditorState,
  edit: (current: BackgroundImage) => unknown,
): Partial<PortalEditorState> {
  const { image } = state.config.background;
  if (!image) return state;
  return parsedInto(state, backgroundImageSchema, edit(image), (edited) => ({
    ...state.config,
    background: { ...state.config.background, image: edited },
  }));
}

function keptSelection(config: PortalConfig, id: string | null) {
  return findSelectedElement(config, id) ? id : null;
}

function branded(
  state: PortalEditorState,
  templateId: TemplateId,
  brand: BrandProfile | null,
): Partial<PortalEditorState> {
  const config = brandedConfig(templateId, brand);
  return {
    config,
    templateId,
    brand,
    selectedElementId: keptSelection(config, state.selectedElementId),
  };
}

function historyEntry(state: PortalEditorState): HistoryEntry {
  return {
    config: state.config,
    templateId: state.templateId,
    brand: state.brand,
  };
}

// Actions rebuild the config even when nothing changed, so history compares by value
function isUnchanged(state: HistoryEntry, next: Partial<HistoryEntry>) {
  return (
    (next.templateId ?? state.templateId) === state.templateId &&
    (next.brand === undefined || isDeepEqual(next.brand, state.brand)) &&
    isDeepEqual(next.config, state.config)
  );
}

// Compares by value so undoing back to the last save clears the flag
export function hasUnsavedChanges(state: PortalEditorState) {
  return !isUnchanged(state.saved, historyEntry(state));
}

export function isAtTemplateDefaults(state: PortalEditorState) {
  return isDeepEqual(
    state.config,
    brandedConfig(state.templateId, state.brand),
  );
}

// The draft holds the latest import and colour choice, so it wins over the applied brand
export function reusableBrand(state: PortalEditorState, sourceUrl?: string) {
  return (
    [state.brandDraft, state.brand].find(
      (brand) =>
        brand !== null &&
        (sourceUrl === undefined || brand.sourceUrl === sourceUrl),
    ) ?? null
  );
}

// A pause this long between edits to the same target starts a new undo step
export const GESTURE_IDLE_MS = 1000;

function gestureKey(action: string, keys: string[], id = "") {
  return `${action}:${id}:${[...keys].sort().join()}`;
}

// Nested paths keep an image upload and a later fit or overlay tweak in separate undo steps
function changedPaths(current: object, changes: object) {
  const before: Record<string, unknown> = { ...current };
  return Object.entries(changes).flatMap(([key, value]) => {
    const previous = before[key];
    if (isPlainRecord(previous) && isPlainRecord(value)) {
      return Object.keys({ ...previous, ...value })
        .filter((sub) => !isDeepEqual(previous[sub], value[sub]))
        .map((sub) => `${key}.${sub}`);
    }
    return isDeepEqual(previous, value) ? [] : [key];
  });
}

interface Gesture {
  key: string;
  entry: HistoryEntry;
  at: number;
}

type EditorUpdate =
  | Partial<PortalEditorState>
  | ((state: PortalEditorStore) => Partial<PortalEditorState>);

export const usePortalEditorStore = create<PortalEditorStore>()((
  setState,
  getState,
) => {
  let gesture: Gesture | null = null;

  // Records every config change, merging a drag or typing run on one target into one undo step
  function set(update: EditorUpdate, key?: string) {
    setState((state) => {
      const next = typeof update === "function" ? update(state) : update;
      const now = Date.now();
      // Checking the entry is still on top means undo, redo or a reset store always end the gesture
      const ongoing =
        key !== undefined &&
        gesture?.key === key &&
        now - gesture.at < GESTURE_IDLE_MS &&
        state.past.at(-1) === gesture.entry &&
        state.future.length === 0
          ? gesture
          : null;
      gesture = ongoing && { ...ongoing, at: now };

      if (!next.config || next.config === state.config) return next;
      if (isUnchanged(state, next)) return { ...next, config: state.config };
      if (ongoing) {
        if (!isUnchanged(ongoing.entry, next)) return next;
        // A gesture that ends where it began leaves nothing to undo
        gesture = null;
        return { ...next, past: state.past.slice(0, -1) };
      }

      const entry = historyEntry(state);
      gesture = key === undefined ? null : { key, entry, at: now };
      return {
        ...next,
        past: [...state.past, entry].slice(-HISTORY_LIMIT),
        future: [],
      };
    });
  }

  return {
    ...initialEditorState,

    // History starts fresh so undo can never jump back into another design
    loadDesign: ({ config, templateId, brand }) =>
      setState({
        config,
        templateId,
        brand,
        past: [],
        future: [],
        selectedElementId: null,
        repositioning: false,
        brandDraft: null,
        generationBase: null,
        saved: { config, templateId, brand },
      }),

    // Takes what was sent to the repository, since edits made while saving are still unsaved
    markSaved: (saved) => setState({ saved }),

    setTemplate: (id) => set((state) => branded(state, id, state.brand)),

    applyBrandedDesign: (templateId, brand) =>
      set((state) => branded(state, templateId, brand)),

    setBrandDraft: (brandDraft) => set({ brandDraft }),

    setBrandDraftColor: (primaryColor) =>
      set((state) =>
        state.brandDraft && colorSchema.safeParse(primaryColor).success
          ? { brandDraft: { ...state.brandDraft, primaryColor } }
          : state,
      ),

    reset: () => set((state) => branded(state, state.templateId, state.brand)),

    // History stays put while an agent reply streams, since the reply lands on top of it when it finishes
    undo: () =>
      setState((state) => {
        const previous = state.past.at(-1);
        if (!previous || state.generationBase) return state;
        return {
          ...previous,
          past: state.past.slice(0, -1),
          future: [historyEntry(state), ...state.future],
          selectedElementId: keptSelection(
            previous.config,
            state.selectedElementId,
          ),
        };
      }),

    redo: () =>
      setState((state) => {
        const [next, ...future] = state.future;
        if (!next || state.generationBase) return state;
        return {
          ...next,
          past: [...state.past, historyEntry(state)],
          future,
          selectedElementId: keptSelection(
            next.config,
            state.selectedElementId,
          ),
        };
      }),

    setDeviceMode: (deviceMode) => set({ deviceMode }),

    // Preview shows the page as guests see it, so nothing stays selected there
    setCanvasMode: (canvasMode) =>
      set(
        canvasMode === "preview"
          ? { canvasMode, selectedElementId: null, repositioning: false }
          : { canvasMode },
      ),

    // Repositioning captures canvas clicks, so a selection would only be stale while it lasts
    setRepositioning: (repositioning) =>
      set(
        repositioning
          ? { repositioning, selectedElementId: null }
          : { repositioning },
      ),

    selectElement: (selectedElementId) => set({ selectedElementId }),

    updateBackground: (changes) =>
      set(
        (state) => {
          const parsed = backgroundSchema.safeParse({
            ...state.config.background,
            ...changes,
          });
          // The renderer trusts the config, so invalid edits never reach it
          if (!parsed.success) return state;
          const imageShown =
            parsed.data.type === "image" && parsed.data.image !== null;
          return {
            config: { ...state.config, background: parsed.data },
            repositioning: state.repositioning && imageShown,
          };
        },
        gestureKey(
          "background",
          changedPaths(getState().config.background, changes),
        ),
      ),

    updateBranding: (changes) =>
      set(
        (state) => {
          const parsed = brandingSchema.safeParse({
            ...state.config.branding,
            ...changes,
          });
          if (!parsed.success) return state;
          const config = { ...state.config, branding: parsed.data };
          return {
            config,
            selectedElementId: keptSelection(config, state.selectedElementId),
          };
        },
        gestureKey(
          "branding",
          changedPaths(getState().config.branding, changes),
        ),
      ),

    addText: () =>
      set((state) => {
        const text: TextElement = {
          id: nextId("text", state.config.texts),
          text: "New text",
          ...defaultTextStyle,
        };
        return {
          config: { ...state.config, texts: [...state.config.texts, text] },
          selectedElementId: text.id,
        };
      }),

    updateText: (id, changes) =>
      set(
        (state) =>
          replaceText(state, id, (current) =>
            clearOverridesFor(
              { ...current, ...changes, id },
              Object.keys(changes),
            ),
          ),
        gestureKey("text", Object.keys(changes), id),
      ),

    removeText: (id) =>
      set((state) => {
        const config = {
          ...state.config,
          texts: state.config.texts.filter((text) => text.id !== id),
        };
        return {
          config,
          selectedElementId: keptSelection(config, state.selectedElementId),
        };
      }),

    addField: () =>
      set((state) => {
        const { fields } = state.config;
        const type = guestFieldTypes.find(
          (candidate) => !fields.some((field) => field.type === candidate),
        );
        if (!type) return state;
        const field: GuestField = { id: nextId("field", fields), type };
        const config = withFields(state, [...fields, field]);
        if (!config) return state;
        return { config, selectedElementId: field.id };
      }),

    updateField: (id, changes) =>
      set(
        (state) =>
          replaceField(state, id, (current) =>
            clearOverridesFor(
              { ...current, ...changes, id },
              Object.keys(changes),
            ),
          ),
        gestureKey("field", Object.keys(changes), id),
      ),

    removeField: (id) =>
      set((state) => {
        const config = {
          ...state.config,
          fields: state.config.fields.filter((field) => field.id !== id),
        };
        return {
          config,
          selectedElementId: keptSelection(config, state.selectedElementId),
        };
      }),

    moveField: (id, offset) =>
      set((state) => {
        const fields = [...state.config.fields];
        const from = fields.findIndex((field) => field.id === id);
        const to = from + offset;
        if (from === -1 || to < 0 || to >= fields.length) return state;
        const [field] = fields.splice(from, 1);
        fields.splice(to, 0, field!);
        return { config: { ...state.config, fields } };
      }),

    updateButton: (changes) =>
      set(
        (state) =>
          replaceButton(state, (current) =>
            clearOverridesFor({ ...current, ...changes }, Object.keys(changes)),
          ),
        gestureKey("button", Object.keys(changes)),
      ),

    updateLogo: (changes) =>
      set(
        (state) =>
          replaceLogo(state, (current) =>
            clearOverridesFor({ ...current, ...changes }, Object.keys(changes)),
          ),
        gestureKey("logo", Object.keys(changes), LOGO_ELEMENT_ID),
      ),

    // Adjustments made for the previous image would misplace the new one, so only fit and overlay carry over
    placeBackgroundImage: (src, recommended) =>
      set((state) => {
        const { background } = state.config;
        const previous = background.image ?? defaultBackgroundImageSettings;
        const parsed = backgroundSchema.safeParse({
          ...background,
          image: {
            ...defaultBackgroundImageSettings,
            fit: previous.fit,
            overlay: previous.overlay,
            src,
            recommended,
          },
        });
        if (!parsed.success) return state;
        return { config: { ...state.config, background: parsed.data } };
      }),

    overrideBackgroundPosition: (device, position) =>
      set(
        (state) =>
          replaceBackgroundImage(state, (current) =>
            setDeviceOverride(current, device, { position }),
          ),
        gestureKey(`override-${device}`, ["position"], BACKGROUND_IMAGE_ID),
      ),

    // Streamed configs skip history, so the canvas can follow the reply without an undo step per chunk
    previewGeneratedConfig: (config) =>
      setState((state) => ({
        config,
        generationBase: state.generationBase ?? historyEntry(state),
        selectedElementId: keptSelection(config, state.selectedElementId),
      })),

    // Null puts back the design from before the reply, as when the agent fails or is stopped
    finishGeneration: (config) =>
      setState((state) => {
        // A reply short enough to finish before any preview has no base yet
        const base = state.generationBase ?? historyEntry(state);
        const final = config ?? base.config;
        const done = {
          config: final,
          generationBase: null,
          selectedElementId: keptSelection(final, state.selectedElementId),
        };
        if (isUnchanged(base, { config: final })) {
          return { ...done, config: base.config };
        }
        return {
          ...done,
          past: [...state.past, base].slice(-HISTORY_LIMIT),
          future: [],
        };
      }),

    clearBackgroundPositionOverride: (device) =>
      set((state) =>
        replaceBackgroundImage(state, (current) =>
          clearDeviceOverride(current, device, "position"),
        ),
      ),
  };
});

function reachableConfigs(state: PortalEditorState) {
  return [state, ...state.past, ...state.future].map((entry) => entry.config);
}

// An image stays alive while undo or redo can bring it back, and is revoked once nothing can
usePortalEditorStore.subscribe((state, previous) => {
  if (
    state.config === previous.config &&
    state.past === previous.past &&
    state.future === previous.future
  ) {
    return;
  }
  revokeUnreachableImageUrls(
    reachableConfigs(previous),
    reachableConfigs(state),
  );
});
