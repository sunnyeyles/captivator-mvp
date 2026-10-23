"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useCurrentDesign } from "@/components/designs/design-loader";
import { Button } from "@/components/ui/button";
import { designRepository } from "@/lib/designs";
import { hasUnsavedChanges, usePortalEditorStore } from "@/lib/editor-store";
import { PublishControls } from "./publish-controls";

export function useSaveDesign() {
  const { design, setDesign } = useCurrentDesign();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const { config, templateId, markSaved } = usePortalEditorStore.getState();
    setPending(true);
    setError(null);
    try {
      const saved = await designRepository().save(design.id, {
        config,
        templateId,
      });
      markSaved({ config, templateId });
      setDesign(saved);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "This design wasn't saved",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  return { save, pending, error };
}

export function SaveControls() {
  const unsaved = usePortalEditorStore(hasUnsavedChanges);
  const { save, pending, error } = useSaveDesign();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
      return;
    }
    if (event.key.toLowerCase() !== "s") return;
    // Always claimed so the browser's own save page dialog never opens
    event.preventDefault();
    if (unsaved && !pending) void save();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!unsaved) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        unsaved && (
          <p role="status" className="text-xs text-muted-foreground">
            Unsaved changes
          </p>
        )
      )}
      <Button
        size="sm"
        variant="outline"
        title="Save (⌘S)"
        disabled={!unsaved || pending}
        onClick={() => void save()}
      >
        {pending ? "Saving…" : "Save"}
      </Button>
      {/* Shares this save so publishing with unsaved changes shows one pending state and error */}
      <PublishControls save={save} saving={pending} unsaved={unsaved} />
    </div>
  );
}
