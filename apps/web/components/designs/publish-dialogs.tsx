"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}

export function ReplaceLiveDialog({
  liveName,
  designName,
  ...props
}: PublishDialogProps & { liveName: string; designName: string }) {
  return (
    <ConfirmDialog
      {...props}
      title={`“${liveName}” is live. Replace it with “${designName}”?`}
      description={`Guests will see “${designName}” instead. “${liveName}” stays in your designs as a draft.`}
      action="Replace and publish"
      pendingAction="Publishing…"
    />
  );
}

export function TakeOfflineDialog({
  designName,
  ...props
}: PublishDialogProps & { designName: string }) {
  return (
    <ConfirmDialog
      {...props}
      title={`Take “${designName}” offline?`}
      description="Guests will no longer see it, and nothing will be live until you publish again. The design itself is kept."
      action="Take offline"
      pendingAction="Taking offline…"
    />
  );
}
