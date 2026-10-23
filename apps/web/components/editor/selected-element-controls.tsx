"use client";

import { X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@repo/ui/button";
import { Separator } from "@repo/ui/separator";
import { usePortalEditorStore } from "@/lib/editor-store";
import {
  findSelectedElement,
  type SelectedElement,
} from "@/lib/selected-element";
import { ButtonControls } from "./button-controls";
import { GuestFieldControls } from "./guest-field-controls";
import { LogoControls, LogoLayoutControls } from "./logo-controls";
import { TextControls } from "./text-controls";

function ElementControls({ selected }: { selected: SelectedElement }) {
  switch (selected.kind) {
    case "text":
      return <TextControls text={selected.element} />;
    case "field":
      return <GuestFieldControls field={selected.element} />;
    case "button":
      return <ButtonControls button={selected.element} />;
    case "logo":
      return (
        <div className="grid gap-4">
          <LogoControls />
          <LogoLayoutControls logo={selected.element} />
        </div>
      );
  }
}

const titleByKind: Record<SelectedElement["kind"], string> = {
  text: "Text",
  field: "Guest field",
  button: "Connect button",
  logo: "Logo",
};

export function SelectedElementControls() {
  // Shallow so edits to other elements leave these controls alone
  const selected = usePortalEditorStore(
    useShallow((state) =>
      findSelectedElement(state.config, state.selectedElementId),
    ),
  );
  const selectElement = usePortalEditorStore((state) => state.selectElement);

  if (!selected) return null;

  return (
    <>
      <section aria-labelledby="selected-group" className="grid gap-3 p-4">
        <div className="flex items-center justify-between">
          <h3
            id="selected-group"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Selected: {titleByKind[selected.kind]}
          </h3>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Clear selection"
            onClick={() => selectElement(null)}
          >
            <X />
          </Button>
        </div>
        {/* Keyed by id so half-typed drafts never carry over to another element */}
        <ElementControls key={selected.id} selected={selected} />
      </section>
      <Separator />
    </>
  );
}
