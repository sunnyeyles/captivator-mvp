import {
  backgroundSchema,
  brandingSchema,
  buttonSchema,
  clearDeviceOverride,
  defaultTextStyle,
  guestFieldTypes,
  LOGO_ELEMENT_ID,
  portalConfigSchema,
  setDeviceOverride,
  templates,
  textElementSchema,
  type Device,
  type GuestField,
  type PortalConfig,
  type StyleOverride,
  type TemplateId,
  type TextElement,
} from "@repo/portal";
import { create } from "zustand";
import { isDeepEqual } from "./equal";
import { revokeUnreachableImageUrls } from "./images";
import { findSelectedElement } from "./selected-element";

export type CanvasMode = "edit" | "preview";

// Only the design is history, so undo never changes device, canvas mode or selection
export interface HistoryEntry {
  config: PortalConfig;
  templateId: TemplateId;
}

export interface PortalEditorState extends HistoryEntry {
  past: HistoryEntry[];
  future: HistoryEntry[];
  deviceMode: Device;
  canvasMode: CanvasMode;
  selectedElementId: string | null;
}

interface PortalEditorActions {
  setTemplate: (id: TemplateId) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  setDeviceMode: (mode: Device) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  selectElement: (id: string | null) => void;
  updateBackground: (changes: Partial<PortalConfig["background"]>) => void;
  updateBranding: (changes: Partial<PortalConfig["branding"]>) => void;
  addText: () => void;
  updateText: (id: string, changes: Partial<Omit<TextElement, "id">>) => void;
  removeText: (id: string) => void;
  addField: () => void;
  updateField: (id: string, changes: Partial<Omit<GuestField, "id">>) => void;
  removeField: (id: string) => void;
  moveField: (id: string, offset: -1 | 1) => void;
  updateButton: (changes: Partial<PortalConfig["button"]>) => void;
  overrideText: (
    id: string,
    device: Device,
    changes: StyleOverride<TextElement>,
  ) => void;
  clearTextOverride: (
    id: string,
    device: Device,
    key: keyof StyleOverride<TextElement>,
  ) => void;
}

export type PortalEditorStore = PortalEditorState & PortalEditorActions;

export const HISTORY_LIMIT = 100;

export const initialEditorState: PortalEditorState = {
  config: templates.minimal.config,
  templateId: "minimal",
  past: [],
  future: [],
  deviceMode: "desktop",
  canvasMode: "edit",
  selectedElementId: null,
};

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

// The renderer trusts the config, so a text edit only lands if the result still passes the schema
function replaceText(
  state: PortalEditorState,
  id: string,
  edit: (current: TextElement) => unknown,
): Partial<PortalEditorState> {
  const current = state.config.texts.find((text) => text.id === id);
  if (!current) return state;
  const parsed = textElementSchema.safeParse(edit(current));
  if (!parsed.success) return state;
  return {
    config: {
      ...state.config,
      texts: state.config.texts.map((text) =>
        text.id === id ? parsed.data : text,
      ),
    },
  };
}

function keptSelection(config: PortalConfig, id: string | null) {
  return findSelectedElement(config, id) ? id : null;
}

function historyEntry(state: PortalEditorState): HistoryEntry {
  return { config: state.config, templateId: state.templateId };
}

// Actions rebuild the config even when nothing changed, so history compares by value
function isUnchanged(state: HistoryEntry, next: Partial<HistoryEntry>) {
  return (
    (next.templateId ?? state.templateId) === state.templateId &&
    isDeepEqual(next.config, state.config)
  );
}

export function isAtTemplateDefaults(state: PortalEditorState) {
  return isDeepEqual(state.config, templates[state.templateId].config);
}

// A pause this long between edits to the same target starts a new undo step
export const GESTURE_IDLE_MS = 1000;

function gestureKey(action: string, keys: string[], id = "") {
  return `${action}:${id}:${[...keys].sort().join()}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export const usePortalEditorStore = create<PortalEditorStore>()((setState, getState) => {
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

    setTemplate: (id) =>
      set((state) => {
        const { config } = templates[id];
        return {
          config,
          templateId: id,
          selectedElementId: keptSelection(config, state.selectedElementId),
        };
      }),

    reset: () =>
      set((state) => {
        const { config } = templates[state.templateId];
        return {
          config,
          selectedElementId: keptSelection(config, state.selectedElementId),
        };
      }),

    undo: () =>
      setState((state) => {
        const previous = state.past.at(-1);
        if (!previous) return state;
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
        if (!next) return state;
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
          ? { canvasMode, selectedElementId: null }
          : { canvasMode },
      ),

    selectElement: (selectedElementId) => set({ selectedElementId }),

    updateBackground: (changes) =>
      set((state) => {
        const parsed = backgroundSchema.safeParse({
          ...state.config.background,
          ...changes,
        });
        // The renderer trusts the config, so invalid edits never reach it
        if (!parsed.success) return state;
        return { config: { ...state.config, background: parsed.data } };
      }, gestureKey(
        "background",
        changedPaths(getState().config.background, changes),
      )),

    updateBranding: (changes) =>
      set((state) => {
        const parsed = brandingSchema.safeParse({
          ...state.config.branding,
          ...changes,
        });
        if (!parsed.success) return state;
        const logoRemoved =
          !parsed.data.logo && state.selectedElementId === LOGO_ELEMENT_ID;
        return {
          config: { ...state.config, branding: parsed.data },
          selectedElementId: logoRemoved ? null : state.selectedElementId,
        };
      }, gestureKey(
        "branding",
        changedPaths(getState().config.branding, changes),
      )),

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
          replaceText(state, id, (current) => ({ ...current, ...changes, id })),
        gestureKey("text", Object.keys(changes), id),
      ),

    removeText: (id) =>
      set((state) => ({
        config: {
          ...state.config,
          texts: state.config.texts.filter((text) => text.id !== id),
        },
        selectedElementId:
          state.selectedElementId === id ? null : state.selectedElementId,
      })),

    overrideText: (id, device, changes) =>
      set(
        (state) =>
          replaceText(state, id, (current) =>
            setDeviceOverride(current, device, changes),
          ),
        gestureKey(`override-${device}`, Object.keys(changes), id),
      ),

    clearTextOverride: (id, device, key) =>
      set((state) =>
        replaceText(state, id, (current) =>
          clearDeviceOverride(current, device, key),
        ),
      ),

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
      set((state) => {
        const config = withFields(
          state,
          state.config.fields.map((field) =>
            field.id === id ? { ...field, ...changes, id } : field,
          ),
        );
        return config ? { config } : state;
      }, gestureKey("field", Object.keys(changes), id)),

    removeField: (id) =>
      set((state) => ({
        config: {
          ...state.config,
          fields: state.config.fields.filter((field) => field.id !== id),
        },
        selectedElementId:
          state.selectedElementId === id ? null : state.selectedElementId,
      })),

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
      set((state) => {
        const parsed = buttonSchema.safeParse({
          ...state.config.button,
          ...changes,
        });
        if (!parsed.success) return state;
        return { config: { ...state.config, button: parsed.data } };
      }, gestureKey("button", Object.keys(changes))),
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
