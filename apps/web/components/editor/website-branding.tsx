"use client";

import type { BrandProfile } from "@repo/portal";
import { RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { reusableBrand, usePortalEditorStore } from "@/lib/editor-store";
import { useBrandImport, WebsiteUrlForm } from "./website-url-form";

export function WebsiteBranding({
  onBrandReady,
}: {
  onBrandReady: (brand: BrandProfile) => void;
}) {
  const setBrandDraft = usePortalEditorStore((state) => state.setBrandDraft);
  const shownBrand = usePortalEditorStore((state) => reusableBrand(state));
  const importer = useBrandImport(openDesigns);

  function openDesigns(brand: BrandProfile) {
    importer.setError(null);
    setBrandDraft(brand);
    onBrandReady(brand);
  }

  function generate(href: string) {
    // Reading the same site again would only repeat the wait, so Refresh from website is the one way to re-read it
    const known = reusableBrand(usePortalEditorStore.getState(), href);
    if (!known) {
      void importer.importSite(href);
      return;
    }
    importer.cancel();
    openDesigns(known);
  }

  return (
    <>
      <WebsiteUrlForm importer={importer} onSubmit={generate} />
      {shownBrand ? (
        <div className="grid gap-2">
          <p className="truncate text-sm text-muted-foreground">
            Branding from {new URL(shownBrand.sourceUrl).host}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDesigns(shownBrand)}
            >
              View designs
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={importer.pending}
              onClick={() => void importer.importSite(shownBrand.sourceUrl)}
            >
              <RefreshCw aria-hidden />
              Refresh from website
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
