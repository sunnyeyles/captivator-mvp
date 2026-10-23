"use client";

import {
  brandedConfig,
  SplashPage,
  templateIds,
  templates,
} from "@repo/portal";
import { Button } from "@/components/ui/button";
import { usePortalEditorStore } from "@/lib/editor-store";

const MOBILE_FRAME = { width: 390, height: 844 };
const THUMBNAIL_WIDTH = 72;
const THUMBNAIL_SCALE = THUMBNAIL_WIDTH / MOBILE_FRAME.width;

export function TemplateGallery() {
  const templateId = usePortalEditorStore((state) => state.templateId);
  const brand = usePortalEditorStore((state) => state.brand);
  const setTemplate = usePortalEditorStore((state) => state.setTemplate);

  return (
    <ul className="grid grid-cols-3 gap-2">
      {templateIds.map((id) => {
        const template = templates[id];
        const selected = id === templateId;
        return (
          <li key={id} className="relative grid justify-items-center gap-1">
            {/* Inert because the preset's own inputs and button must never take focus or clicks here */}
            <div
              inert
              aria-hidden
              className={`overflow-hidden rounded-md ${selected ? "ring-2 ring-primary" : "ring-1 ring-border"}`}
              style={{
                width: THUMBNAIL_WIDTH,
                height: MOBILE_FRAME.height * THUMBNAIL_SCALE,
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  ...MOBILE_FRAME,
                  transform: `scale(${THUMBNAIL_SCALE})`,
                }}
              >
                <SplashPage
                  config={brandedConfig(id, brand)}
                  device="mobile"
                  mode="published"
                />
              </div>
            </div>
            {/* The stretched hit area makes the whole card clickable without nesting the preview's button inside this one */}
            <Button
              variant="ghost"
              size="xs"
              aria-pressed={selected}
              title={template.description}
              className="after:absolute after:inset-0 after:rounded-md aria-pressed:font-semibold"
              onClick={() => setTemplate(id)}
            >
              {template.name}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
