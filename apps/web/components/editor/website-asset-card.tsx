"use client";

import { BRAND_COLORS_MAX, type BrandProfile } from "@repo/portal";
import { Globe } from "lucide-react";
import { useState } from "react";
import type { DesignStart } from "@/lib/design-agent";
import { imageColors } from "@/lib/dominant-colors";
import { PromptCard } from "./prompt-card";
import { useBrandImport, WebsiteUrlForm } from "./website-url-form";

async function startFromBrand(brand: BrandProfile): Promise<DesignStart> {
  const logoColors = brand.logo ? await imageColors(brand.logo) : [];
  const colors = [...new Set([...brand.colors, ...logoColors])].slice(
    0,
    BRAND_COLORS_MAX,
  );
  return {
    text: `Design a page using the brand from ${new URL(brand.sourceUrl).hostname}`,
    brand: {
      name: brand.name,
      description: brand.description ?? undefined,
      sourceUrl: brand.sourceUrl,
      colors,
      hasLogo: brand.logo !== null,
    },
    assets: {
      logo: brand.logo ?? undefined,
      background: brand.image
        ? { src: brand.image, recommended: brand.imageRecommended }
        : undefined,
    },
  };
}

export function WebsiteAssetCard({
  disabled,
  onStart,
}: {
  disabled: boolean;
  onStart: (start: DesignStart) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const importer = useBrandImport((brand) => {
    void startFromBrand(brand).then(onStart);
  });

  return (
    <PromptCard
      icon={Globe}
      title="From your website"
      description="Use your site's logo, colours and copy."
      disabled={disabled}
      expanded={open}
      onClick={() => {
        if (open) importer.cancel();
        setOpen(!open);
      }}
    >
      {open ? (
        <WebsiteUrlForm
          importer={importer}
          onSubmit={(href) => void importer.importSite(href)}
          submitLabel="Design from my website"
          disabled={disabled}
        />
      ) : null}
    </PromptCard>
  );
}
