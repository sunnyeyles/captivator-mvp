"use client";

import {
  CloudOff,
  Copy,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PortalThumbnail } from "@/components/preview/portal-thumbnail";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  designRepository,
  designStatus,
  replacesOtherLive,
  type Design,
  type LiveDesign,
} from "@/lib/designs";
import { DesignStatusBadge } from "./design-status-badge";
import { ReplaceLiveDialog, TakeOfflineDialog } from "./publish-dialogs";

const editedFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function DesignCard({
  design,
  live,
  onChange,
}: {
  design: Design;
  live: LiveDesign | undefined;
  onChange: () => Promise<void>;
}) {
  const [dialog, setDialog] = useState<
    "rename" | "delete" | "replace" | "offline" | null
  >(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    try {
      await action();
      await onChange();
      setDialog(null);
    } finally {
      setPending(false);
    }
  }

  function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    if (!name) return;
    void run(() => designRepository().rename(design.id, name));
  }

  function publish() {
    if (replacesOtherLive(design, live)) {
      setDialog("replace");
      return;
    }
    void run(() => designRepository().publish(design.id));
  }

  const status = designStatus(design, live);
  const nameInputId = `rename-${design.id}`;

  return (
    <li className="relative grid overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-md">
      <div className="flex justify-center bg-muted pt-4">
        <PortalThumbnail
          config={design.config}
          width={160}
          className="rounded-t-xl shadow-sm ring-1 ring-border"
        />
      </div>
      <div className="flex items-start gap-2 border-t p-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          {/* The stretched hit area opens the design from anywhere on the card except its menu */}
          <Link
            href={`/designs/${design.id}`}
            className="truncate text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            {design.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            Edited{" "}
            <time dateTime={design.updatedAt}>
              {editedFormat.format(new Date(design.updatedAt))}
            </time>
          </p>
          <div className="pt-1">
            <DesignStatusBadge status={status} />
          </div>
        </div>
        {/* Non-modal so the dialogs it opens get pointer events back cleanly */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={`Actions for ${design.name}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            // Returning focus to the trigger would pull it out of the dialog an item just opened
            onCloseAutoFocus={(event) => {
              if (dialog) event.preventDefault();
            }}
          >
            <DropdownMenuItem onSelect={() => setDialog("rename")}>
              <Pencil aria-hidden />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={pending}
              onSelect={() =>
                void run(() => designRepository().duplicate(design.id))
              }
            >
              <Copy aria-hidden />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {status !== "live" && (
              <DropdownMenuItem disabled={pending} onSelect={publish}>
                <Send aria-hidden />
                {status === "live-changed" ? "Publish changes" : "Publish"}
              </DropdownMenuItem>
            )}
            {status !== "draft" && (
              <DropdownMenuItem onSelect={() => setDialog("offline")}>
                <CloudOff aria-hidden />
                Take offline
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {status === "draft" ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDialog("delete")}
              >
                <Trash2 aria-hidden />
                Delete
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="items-start">
                <Trash2 aria-hidden className="mt-0.5" />
                <span className="grid">
                  Delete
                  <span className="text-xs">
                    Take it offline before deleting
                  </span>
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={dialog === "rename"}
        onOpenChange={(open) => setDialog(open ? "rename" : null)}
      >
        <DialogContent>
          <form onSubmit={rename} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Rename design</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor={nameInputId}>Name</Label>
              <Input
                id={nameInputId}
                name="name"
                defaultValue={design.name}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {live && (
        <ReplaceLiveDialog
          open={dialog === "replace"}
          onOpenChange={(open) => setDialog(open ? "replace" : null)}
          liveName={live.designName}
          designName={design.name}
          pending={pending}
          onConfirm={() =>
            void run(() => designRepository().publish(design.id))
          }
        />
      )}

      <TakeOfflineDialog
        open={dialog === "offline"}
        onOpenChange={(open) => setDialog(open ? "offline" : null)}
        designName={design.name}
        pending={pending}
        onConfirm={() => void run(() => designRepository().unpublish())}
      />

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title={`Delete “${design.name}”?`}
        description="This design will be removed for good. This can’t be undone."
        action="Delete"
        variant="destructive"
        pending={pending}
        pendingAction="Deleting…"
        onConfirm={() => void run(() => designRepository().remove(design.id))}
      />
    </li>
  );
}
