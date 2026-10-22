"use client";

import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";

export function BackgroundColorControl() {
  const color = usePortalEditorStore((state) => state.config.background.color);
  const updateBackground = usePortalEditorStore(
    (state) => state.updateBackground,
  );

  return (
    <ColorField
      label="Background colour"
      color={color}
      onChange={(value) => updateBackground({ color: value })}
    />
  );
}
