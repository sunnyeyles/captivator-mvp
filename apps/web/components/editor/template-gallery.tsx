"use client";

import {
  brandedConfig,
  templateIds,
  templates,
  type BrandProfile,
  type TemplateId,
} from "@repo/portal";
import { Button } from "@repo/ui/button";
import { PortalThumbnail } from "@/components/preview/portal-thumbnail";
import { usePortalEditorStore } from "@/lib/editor-store";

export function TemplateGrid({
  selectedId,
  onSelect,
  brand = null,
  disabled = false,
  thumbnailWidth = 72,
}: {
  selectedId?: TemplateId;
  onSelect: (id: TemplateId) => void;
  brand?: BrandProfile | null;
  disabled?: boolean;
  thumbnailWidth?: number;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {templateIds.map((id) => {
        const template = templates[id];
        const selected = id === selectedId;
        return (
          <li key={id} className="relative grid justify-items-center gap-1">
            <PortalThumbnail
              config={brandedConfig(id, brand)}
              width={thumbnailWidth}
              className={`rounded-md ${selected ? "ring-2 ring-primary" : "ring-1 ring-border"}`}
            />
            {/* The stretched hit area makes the whole card clickable without nesting the preview's button inside this one */}
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={selected}
              disabled={disabled}
              title={template.description}
              className="after:absolute after:inset-0 after:rounded-md aria-pressed:font-semibold"
              onClick={() => onSelect(id)}
            >
              {template.name}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function TemplateGallery() {
  const templateId = usePortalEditorStore((state) => state.templateId);
  const brand = usePortalEditorStore((state) => state.brand);
  const setTemplate = usePortalEditorStore((state) => state.setTemplate);

  return (
    <TemplateGrid
      selectedId={templateId}
      brand={brand}
      onSelect={setTemplate}
    />
  );
}
