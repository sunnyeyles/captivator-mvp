"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Leave without saving?"
        description="Your unsaved changes will be lost."
        action="Leave"
        cancelLabel="Keep editing"
        variant="destructive"
        onConfirm={() => router.push("/")}
      />
    </>
  );
}
