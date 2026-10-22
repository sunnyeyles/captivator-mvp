import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import type { RenderMode } from "../schema";

export interface Selection {
  mode: RenderMode;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
}

type SelectableAttributes = HTMLAttributes<HTMLElement> & {
  "data-element-id"?: string;
  "data-selected"?: true;
};

// Selectable elements spread these so a new element type only needs its id to join canvas selection
export function selectableProps(
  id: string,
  { mode, selectedElementId, onSelectElement }: Selection,
): SelectableAttributes {
  if (mode !== "edit" || !onSelectElement) return {};

  return {
    "data-element-id": id,
    "data-selected": selectedElementId === id ? true : undefined,
    role: "button",
    tabIndex: 0,
    "aria-pressed": selectedElementId === id,
    onClick: (event: MouseEvent) => {
      // Stops the page root from treating this click as a click on empty canvas
      event.stopPropagation();
      onSelectElement(id);
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      onSelectElement(id);
    },
  };
}

export function clearSelectionProps({
  mode,
  onSelectElement,
}: Selection): HTMLAttributes<HTMLElement> {
  if (mode !== "edit" || !onSelectElement) return {};
  return { onClick: () => onSelectElement(null) };
}
