"use client";

import type { ComponentProps } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  action,
  cancelLabel = "Cancel",
  variant,
  pending = false,
  pendingAction = action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  action: string;
  cancelLabel?: string;
  variant?: ComponentProps<typeof AlertDialogAction>["variant"];
  pending?: boolean;
  pendingAction?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
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
