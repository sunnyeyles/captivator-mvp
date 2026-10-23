"use client";

import {
  brandedConfig,
  SplashPage,
  templateIds,
  templates,
  type BrandProfile,
  type Device,
} from "@repo/portal";
import { memo, useDeferredValue, useId, useState } from "react";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { deviceFrames } from "@/lib/device-frames";
import { isAtTemplateDefaults, usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { DeviceToggle } from "./device-mode-switcher";

const PREVIEW_BOX = { width: 240, height: 280 };

const missingPhrases = {
  logo: "a logo",
  image: "an image",
  colors: "brand colours",
} as const;

function listPhrases(phrases: string[]) {
  if (phrases.length <= 1) return phrases.join("");
  return `${phrases.slice(0, -1).join(", ")} or ${phrases.at(-1)}`;
}

function MissingDetailsNote({ missing }: { missing: BrandProfile["missing"] }) {
  const details = missing.flatMap((detail) =>
    detail === "name" ? [] : [missingPhrases[detail]],
  );
  if (missing.length === 0) return null;
  return (
    <div className="grid gap-1 text-sm text-muted-foreground">
      {missing.includes("name") ? (
        <p>
          We couldn&apos;t find your business name, so the designs use your web
          address. You can change the heading after choosing a design.
        </p>
      ) : null}
      {details.length > 0 ? (
        <p>
          We couldn&apos;t find {listPhrases(details)} on this site. You can add{" "}
          {details.length === 1 ? "it" : "them"} after choosing a design.
        </p>
      ) : null}
    </div>
  );
}

// Memoised so a deferred brand lets colour picker drags skip these full page renders until React is idle
const DesignPreview = memo(function DesignPreview({
  brand,
  device,
  id,
}: {
  brand: BrandProfile;
  device: Device;
  id: (typeof templateIds)[number];
}) {
  const frame = deviceFrames[device];
  const scale = Math.min(
    PREVIEW_BOX.width / frame.width,
    PREVIEW_BOX.height / frame.height,
  );
  return (
    <div
      className="flex items-center justify-center rounded-md bg-editor-canvas"
      style={{ height: PREVIEW_BOX.height }}
    >
      {/* Inert because the design's own inputs and button must never take focus or clicks here */}
      <div
        inert
        aria-hidden
        className="overflow-hidden rounded-md ring-1 ring-border"
        style={{ width: frame.width * scale, height: frame.height * scale }}
      >
        <div
          className="origin-top-left"
          style={{ ...frame, transform: `scale(${scale})` }}
        >
          <SplashPage
            config={brandedConfig(id, brand)}
            device={device}
            mode="published"
          />
        </div>
      </div>
    </div>
  );
});

// Only mounted while the dialog is open, so the full config comparison never runs on edits made with it closed
function EditWarning() {
  const atTemplateDefaults = usePortalEditorStore(isAtTemplateDefaults);
  if (atTemplateDefaults) return null;
  return (
    <p className="rounded-md border bg-muted px-3 py-2 text-sm">
      Using a design replaces your current edits. You can undo this.
    </p>
  );
}

function BrandColorRow({ brand }: { brand: BrandProfile }) {
  const setBrandDraftColor = usePortalEditorStore(
    (state) => state.setBrandDraftColor,
  );
  const groupId = useId();

  return (
    <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,16rem)] sm:items-end sm:gap-4">
      {brand.colors.length > 0 ? (
        <div className="grid gap-2">
          <p id={groupId} className="text-sm font-medium">
            Colours from your site
          </p>
          <div
            role="group"
            aria-labelledby={groupId}
            className="flex flex-wrap gap-2"
          >
            {brand.colors.map((color) => (
              <Button
                key={color}
                variant="outline"
                size="icon"
                aria-pressed={color === brand.primaryColor}
                aria-label={color}
                title={color}
                className="aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"
                // The swatch shows the customer's colour, which is content rather than editor styling
                style={{ backgroundColor: color }}
                onClick={() => setBrandDraftColor(color)}
              />
            ))}
          </div>
        </div>
      ) : null}
      <ColorField
        label="Brand colour"
        color={brand.primaryColor ?? ""}
        onChange={setBrandDraftColor}
      />
    </div>
  );
}

interface BrandDesignChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandDesignChooser({
  open,
  onOpenChange,
}: BrandDesignChooserProps) {
  const brand = usePortalEditorStore((state) => state.brandDraft);
  const applyBrandedDesign = usePortalEditorStore(
    (state) => state.applyBrandedDesign,
  );
  // Local so previewing another device never changes the editor's own device mode
  const [device, setDevice] = useState<Device>("desktop");
  const previewBrand = useDeferredValue(brand);

  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Designs for {brand.name}</DialogTitle>
          <DialogDescription>
            Generated from {new URL(brand.sourceUrl).host}. Choose one to keep
            editing it.
          </DialogDescription>
        </DialogHeader>
        <DeviceToggle
          label="Preview device"
          value={device}
          onValueChange={setDevice}
        />
        <BrandColorRow brand={brand} />
        <MissingDetailsNote missing={brand.missing} />
        <EditWarning />
        <ul className="grid gap-4 sm:grid-cols-3">
          {templateIds.map((id) => (
            <li key={id} className="grid gap-3 rounded-lg border p-3">
              <h3 className="text-sm font-medium">{templates[id].name}</h3>
              {previewBrand ? (
                <DesignPreview brand={previewBrand} device={device} id={id} />
              ) : null}
              <Button
                onClick={() => {
                  applyBrandedDesign(id, brand);
                  onOpenChange(false);
                }}
              >
                Use this design
                <span className="sr-only">: {templates[id].name}</span>
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
