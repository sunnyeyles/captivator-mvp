"use client";

import type { ReactNode } from "react";
import { Separator } from "@repo/ui/separator";
import { usePortalEditorStore } from "@/lib/editor-store";
import { findSelectedElement } from "@/lib/selected-element";
import { BackgroundControls } from "./background-controls";
import { ChangeDesignDialog } from "./change-design-dialog";
import { ElementList } from "./element-list";

function PanelSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3 p-4">
      <h3
        id={id}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

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
      <PanelSection id="elements-group" title="Elements">
        <ElementList />
      </PanelSection>
      <Separator />
      <PanelSection id="background-group" title="Background">
        <BackgroundControls />
      </PanelSection>
    </>
  );
}
