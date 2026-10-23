"use client";

import { Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@repo/ui/button";
import { usePortalEditorStore } from "@/lib/editor-store";

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
  const undo = usePortalEditorStore((state) => state.undo);
  const redo = usePortalEditorStore((state) => state.redo);
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
    </div>
  );
}
