"use client";

import { CONNECT_BUTTON_ID } from "@repo/portal";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ButtonControls } from "./button-controls";

export function ConnectButtonGroup() {
  const button = usePortalEditorStore((state) => state.config.button);
  const isSelected = usePortalEditorStore(
    (state) => state.selectedElementId === CONNECT_BUTTON_ID,
  );

  // The Selected group already shows these controls, and two live copies of one input would be confusing
  if (isSelected) {
    return (
      <p className="text-sm text-muted-foreground">
        Editing the selected Connect button above.
      </p>
    );
  }

  return <ButtonControls button={button} />;
}
