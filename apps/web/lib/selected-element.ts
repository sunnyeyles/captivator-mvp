import {
  CONNECT_BUTTON_ID,
  guestFieldDefaults,
  LOGO_ELEMENT_ID,
  type ConnectButton,
  type GuestField,
  type Logo,
  type PortalConfig,
  type TextElement,
} from "@repo/portal";

// Elements are the config's own objects, never copies, so a shallow compare can skip unrelated edits
export type SelectedElement = { id: string } & (
  | { kind: "text"; element: TextElement }
  | { kind: "field"; element: GuestField }
  | { kind: "button"; element: ConnectButton }
  | { kind: "logo"; element: Logo }
);

export function textName(text: TextElement) {
  return text.text.trim() || "Empty text";
}

export function fieldName(field: GuestField) {
  return field.label || guestFieldDefaults[field.type].label;
}

export function elementName(selected: SelectedElement) {
  switch (selected.kind) {
    case "text":
      return textName(selected.element);
    case "field":
      return fieldName(selected.element);
    case "button":
      return "Connect button";
    case "logo":
      return "Logo";
  }
}

export function findSelectedElement(
  config: PortalConfig,
  id: string | null,
): SelectedElement | null {
  if (id === null) return null;
  if (id === LOGO_ELEMENT_ID) {
    const logo = config.branding.logo;
    return logo ? { id, kind: "logo", element: logo } : null;
  }
  const text = config.texts.find((candidate) => candidate.id === id);
  if (text) return { id, kind: "text", element: text };
  const field = config.fields.find((candidate) => candidate.id === id);
  if (field) return { id, kind: "field", element: field };
  if (id === CONNECT_BUTTON_ID) {
    return { id, kind: "button", element: config.button };
  }
  return null;
}
