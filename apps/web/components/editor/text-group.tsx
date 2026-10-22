"use client";

import { Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortalEditorStore } from "@/lib/editor-store";

export function TextGroup() {
  const texts = usePortalEditorStore((state) => state.config.texts);
  const selectedElementId = usePortalEditorStore(
    (state) => state.selectedElementId,
  );
  const selectElement = usePortalEditorStore((state) => state.selectElement);
  const addText = usePortalEditorStore((state) => state.addText);

  return (
    <div className="grid gap-2">
      {texts.length > 0 ? (
        <ul className="grid gap-1">
          {texts.map((text) => (
            <li key={text.id}>
              <Button
                variant={text.id === selectedElementId ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                aria-pressed={text.id === selectedElementId}
                onClick={() => selectElement(text.id)}
              >
                <Type />
                <span className="truncate">
                  {text.text.trim() || "Empty text"}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No text yet.</p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={addText}
      >
        <Plus />
        Add text
      </Button>
    </div>
  );
}
