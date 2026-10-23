"use client";

import { ArrowLeft } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@repo/ui/button";
import { usePortalEditorStore } from "@/lib/editor-store";
import {
  elementName,
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
    <section aria-labelledby="selected-group" className="grid gap-4 p-4">
      <div className="grid justify-items-start gap-1">
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 text-muted-foreground"
          onClick={() => selectElement(null)}
        >
          <ArrowLeft />
          Back to page
        </Button>
        <h2
          id="selected-group"
          className="max-w-full truncate text-sm font-semibold"
        >
          {elementName(selected)}
        </h2>
      </div>
      {/* Keyed by id so half-typed drafts never carry over to another element */}
      <ElementControls key={selected.id} selected={selected} />
    </section>
  );
}
