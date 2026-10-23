"use client";

import { Eye, Pencil } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore, type CanvasMode } from "@/lib/editor-store";

function isCanvasMode(value: string): value is CanvasMode {
  return value === "edit" || value === "preview";
}

export function CanvasModeSwitcher() {
  const canvasMode = usePortalEditorStore((state) => state.canvasMode);
  const setCanvasMode = usePortalEditorStore((state) => state.setCanvasMode);

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label="Canvas mode"
      value={canvasMode}
      // Radix emits an empty string when the active item is clicked again, which would leave no mode selected
      onValueChange={(value) => isCanvasMode(value) && setCanvasMode(value)}
    >
      <ToggleGroupItem value="edit" aria-label="Edit">
        <Pencil />
        Edit
      </ToggleGroupItem>
      <ToggleGroupItem value="preview" aria-label="Preview">
        <Eye />
        Preview
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
