"use client";

import { Separator } from "@repo/ui/separator";
import { usePortalEditorStore } from "@/lib/editor-store";
import { findSelectedElement } from "@/lib/selected-element";
import { BackgroundControls } from "./background-controls";
import { ChangeDesignDialog } from "./change-design-dialog";
import { ElementList } from "./element-list";

export function PagePanel() {
  // The selected element's own panel takes the sidebar's place
  const hasSelection = usePortalEditorStore(
    (state) =>
      findSelectedElement(state.config, state.selectedElementId) !== null,
  );

  if (hasSelection) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-semibold">Page</h2>
        <ChangeDesignDialog />
      </div>
      <Separator />
      <section aria-labelledby="elements-group" className="grid gap-3 p-4">
        <h3
          id="elements-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Elements
        </h3>
        <ElementList />
      </section>
      <Separator />
      <section aria-labelledby="background-group" className="grid gap-3 p-4">
        <h3
          id="background-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Background
        </h3>
        <BackgroundControls />
      </section>
    </>
  );
}
