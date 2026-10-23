"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Button } from "@repo/ui/button";
import { hasUnsavedChanges, usePortalEditorStore } from "@/lib/editor-store";

export function BackToDesignsLink() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button asChild variant="ghost" size="icon-sm">
        <Link
          href="/"
          aria-label="Back to designs"
          title="Back to designs"
          onClick={(event) => {
            if (!hasUnsavedChanges(usePortalEditorStore.getState())) return;
            event.preventDefault();
            setConfirming(true);
          }}
        >
          <ArrowLeft aria-hidden />
        </Link>
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => router.push("/")}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
