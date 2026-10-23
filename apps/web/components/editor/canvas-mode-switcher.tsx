"use client";

import { Eye } from "lucide-react";
import { Toggle } from "@repo/ui/toggle";
import { usePortalEditorStore } from "@/lib/editor-store";

export function CanvasModeSwitcher() {
  const canvasMode = usePortalEditorStore((state) => state.canvasMode);
  const setCanvasMode = usePortalEditorStore((state) => state.setCanvasMode);

  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={canvasMode === "preview"}
      onPressedChange={(pressed) => setCanvasMode(pressed ? "preview" : "edit")}
    >
      <Eye />
      Preview
    </Toggle>
  );
}
