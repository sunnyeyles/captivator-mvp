"use client";

import { templates, type BrandProfile, type TemplateId } from "@repo/portal";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MissingDetailsNote } from "@/components/editor/brand-design-chooser";
import { TemplateGrid } from "@/components/editor/template-gallery";
import {
  useBrandImport,
  WebsiteUrlForm,
} from "@/components/editor/website-url-form";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Separator } from "@repo/ui/separator";
import { designRepository } from "@/lib/designs";

function describe(pendingId: TemplateId | null, brand: BrandProfile | null) {
  if (pendingId) return `Creating from ${templates[pendingId].name}…`;
  if (brand) return `Designs for ${brand.name}. Pick one to start editing.`;
  return "Brand the templates from your website, or pick one as it is.";
}

// Lives inside the dialog content so closing the dialog drops the brand and aborts a running import
function NewDesignChooser() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<TemplateId | null>(null);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const importer = useBrandImport(setBrand);

  async function createFrom(templateId: TemplateId) {
    setPendingId(templateId);
    importer.cancel();
    const design = await designRepository().create(
      templateId,
      brand?.name ?? templates[templateId].name,
      brand,
    );
    router.push(`/designs/${design.id}`);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>New design</DialogTitle>
        <DialogDescription>{describe(pendingId, brand)}</DialogDescription>
      </DialogHeader>
      <WebsiteUrlForm
        importer={importer}
        onSubmit={(href) => void importer.importSite(href)}
      />
      {brand ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm text-muted-foreground">
              Branding from {new URL(brand.sourceUrl).host}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setBrand(null)}>
              Remove branding
            </Button>
          </div>
          <MissingDetailsNote missing={brand.missing} />
        </div>
      ) : null}
      <Separator />
      <TemplateGrid
        selectedId={pendingId ?? undefined}
        brand={brand}
        onSelect={(id) => void createFrom(id)}
        disabled={pendingId !== null}
      />
    </>
  );
}

export function NewDesignDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          New design
        </Button>
      </DialogTrigger>
      <DialogContent>
        <NewDesignChooser />
      </DialogContent>
    </Dialog>
  );
}
