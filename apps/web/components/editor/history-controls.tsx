"use client";

import { Redo2, RotateCcw, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isAtTemplateDefaults, usePortalEditorStore } from "@/lib/editor-store";

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("input, textarea, select") !== null)
  );
}

function useHistoryShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      // Text controls keep their native undo for what is being typed
      if (isEditable(event.target)) return;
      const { undo, redo } = usePortalEditorStore.getState();
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y" && !event.shiftKey) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

export function HistoryControls() {
  const canUndo = usePortalEditorStore((state) => state.past.length > 0);
  const canRedo = usePortalEditorStore((state) => state.future.length > 0);
  const atTemplateDefaults = usePortalEditorStore(isAtTemplateDefaults);
  const undo = usePortalEditorStore((state) => state.undo);
  const redo = usePortalEditorStore((state) => state.redo);
  const reset = usePortalEditorStore((state) => state.reset);
  useHistoryShortcuts();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
        onClick={undo}
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
        onClick={redo}
      >
        <Redo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Reset to template"
        title="Reset to template"
        disabled={atTemplateDefaults}
        onClick={reset}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}
