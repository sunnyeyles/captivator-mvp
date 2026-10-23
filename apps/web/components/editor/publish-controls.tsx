"use client";

import { useState } from "react";
import { useCurrentDesign } from "@/components/designs/design-loader";
import {
  ReplaceLiveDialog,
  TakeOfflineDialog,
} from "@/components/designs/publish-dialogs";
import { Button } from "@/components/ui/button";
import { designRepository, designStatus } from "@/lib/designs";
import { hasUnsavedChanges, usePortalEditorStore } from "@/lib/editor-store";

export function PublishControls({
  save,
  saving,
  unsaved,
}: {
  save: () => Promise<boolean>;
  saving: boolean;
  unsaved: boolean;
}) {
  const { design, live, setLive } = useCurrentDesign();
  const [dialog, setDialog] = useState<"replace" | "offline" | null>(null);
  const [pending, setPending] = useState<"publish" | "offline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = designStatus(design, live);
  const upToDate = status === "live" && !unsaved;

  async function run(kind: "publish" | "offline", action: () => Promise<void>) {
    setPending(kind);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setPending(null);
      setDialog(null);
    }
  }

  function publish() {
    void run("publish", async () => {
      // Read at confirm time, since edits can land while the dialog is open
      const needsSave = hasUnsavedChanges(usePortalEditorStore.getState());
      // A failed save reports its own error beside the Save button
      if (needsSave && !(await save())) return;
      setLive(await designRepository().publish(design.id));
    });
  }

  function takeOffline() {
    void run("offline", async () => {
      await designRepository().unpublish();
      setLive(undefined);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {status !== "draft" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending !== null}
          onClick={() => setDialog("offline")}
        >
          Take offline
        </Button>
      )}
      <Button
        size="sm"
        title={upToDate ? "This design is live and up to date" : undefined}
        disabled={upToDate || saving || pending !== null}
        onClick={() => {
          if (live && live.designId !== design.id) setDialog("replace");
          else publish();
        }}
      >
        {pending === "publish" ? "Publishing…" : "Publish"}
      </Button>

      {live && (
        <ReplaceLiveDialog
          open={dialog === "replace"}
          onOpenChange={(open) => setDialog(open ? "replace" : null)}
          liveName={live.designName}
          designName={design.name}
          pending={pending === "publish"}
          onConfirm={publish}
        />
      )}
      <TakeOfflineDialog
        open={dialog === "offline"}
        onOpenChange={(open) => setDialog(open ? "offline" : null)}
        designName={design.name}
        pending={pending === "offline"}
        onConfirm={takeOffline}
      />
    </div>
  );
}
