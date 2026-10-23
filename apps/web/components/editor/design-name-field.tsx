"use client";

import { useState } from "react";
import { useCurrentDesign } from "@/components/designs/design-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { designRepository } from "@/lib/designs";

export function DesignNameField() {
  const { design, setDesign } = useCurrentDesign();
  const [editing, setEditing] = useState(false);

  function commit(value: string) {
    setEditing(false);
    const name = value.trim();
    if (!name || name === design.name) return;
    // Shown straight away and put back if the rename fails
    setDesign({ ...design, name });
    designRepository()
      .rename(design.id, name)
      .then(setDesign, () => setDesign(design));
  }

  if (editing) {
    return (
      <Input
        aria-label="Design name"
        defaultValue={design.name}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.value = design.name;
          if (event.key === "Enter" || event.key === "Escape") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-48"
      />
    );
  }

  return (
    <h1 className="min-w-0">
      <Button
        variant="ghost"
        size="sm"
        title="Rename design"
        className="max-w-48 font-semibold"
        onClick={() => setEditing(true)}
      >
        <span className="truncate">{design.name}</span>
      </Button>
    </h1>
  );
}
