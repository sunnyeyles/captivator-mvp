"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}

function ConfirmDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
  title,
  description,
  action,
  pendingAction,
}: ConfirmDialogProps & {
  title: string;
  description: string;
  action: string;
  pendingAction: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              // Stays open until the action finishes so the pending state is visible
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? pendingAction : action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReplaceLiveDialog({
  liveName,
  designName,
  ...props
}: ConfirmDialogProps & { liveName: string; designName: string }) {
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
}: ConfirmDialogProps & { designName: string }) {
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
