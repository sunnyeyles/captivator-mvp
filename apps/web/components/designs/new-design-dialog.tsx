"use client";

import { templates, type TemplateId } from "@repo/portal";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TemplateGrid } from "@/components/editor/template-gallery";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { designRepository } from "@/lib/designs";

export function NewDesignDialog() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<TemplateId | null>(null);

  async function createFrom(templateId: TemplateId) {
    setPendingId(templateId);
    const design = await designRepository().create(
      templateId,
      templates[templateId].name,
    );
    router.push(`/designs/${design.id}`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          New design
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New design</DialogTitle>
          <DialogDescription>
            {pendingId
              ? `Creating from ${templates[pendingId].name}…`
              : "Pick a template to start from."}
          </DialogDescription>
        </DialogHeader>
        <TemplateGrid
          selectedId={pendingId ?? undefined}
          onSelect={(id) => void createFrom(id)}
          disabled={pendingId !== null}
        />
      </DialogContent>
    </Dialog>
  );
}
