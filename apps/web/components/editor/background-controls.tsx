"use client";

import {
  defaultOverlay,
  type BackgroundImage,
  type PortalConfig,
} from "@repo/portal";
import { Move, RotateCcw } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { BackgroundColorControl } from "./background-color-control";
import { ColorField } from "./color-field";
import { deviceDetails } from "./device-override-field";
import { ImageUploadField } from "./image-upload-field";

const typeOptions: {
  value: PortalConfig["background"]["type"];
  label: string;
}[] = [
  { value: "color", label: "Colour" },
  { value: "image", label: "Image" },
];

const fitOptions: { value: BackgroundImage["fit"]; label: string }[] = [
  { value: "cover", label: "Fill" },
  { value: "contain", label: "Fit" },
];

function OptionToggle<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label asChild>
        <span>{label}</span>
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label={label}
        className="w-full"
        value={value}
        onValueChange={(next) => {
          // Radix emits an empty string when the active item is clicked again
          const option = options.find((candidate) => candidate.value === next);
          if (option) onChange(option.value);
        }}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="flex-1 px-1 text-xs"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function OverlayControls({
  overlay,
  onChange,
}: {
  overlay: BackgroundImage["overlay"];
  onChange: (overlay: BackgroundImage["overlay"]) => void;
}) {
  const switchId = useId();
  const opacityId = useId();

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={switchId}>Overlay</Label>
        <Switch
          id={switchId}
          checked={overlay !== null}
          onCheckedChange={(checked) =>
            onChange(checked ? (overlay ?? defaultOverlay) : null)
          }
        />
      </div>
      {overlay ? (
        <>
          <ColorField
            label="Overlay colour"
            color={overlay.color}
            onChange={(color) => onChange({ ...overlay, color })}
          />
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label id={opacityId}>Overlay opacity</Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {Math.round(overlay.opacity * 100)}%
              </span>
            </div>
            <Slider
              aria-labelledby={opacityId}
              min={0}
              max={100}
              step={5}
              value={[Math.round(overlay.opacity * 100)]}
              onValueChange={([percent = 0]) =>
                onChange({ ...overlay, opacity: percent / 100 })
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function PositionControls({ image }: { image: BackgroundImage }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const canvasMode = usePortalEditorStore((state) => state.canvasMode);
  const repositioning = usePortalEditorStore((state) => state.repositioning);
  const setRepositioning = usePortalEditorStore(
    (state) => state.setRepositioning,
  );
  const clearOverride = usePortalEditorStore(
    (state) => state.clearBackgroundPositionOverride,
  );
  const { name, icon: Icon } = deviceDetails[deviceMode];
  const overridden = image.overrides?.[deviceMode]?.position !== undefined;

  return (
    <div className="grid gap-2">
      <Label asChild>
        <span>Image position</span>
      </Label>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        aria-pressed={repositioning}
        // The reposition layer only exists on the edit canvas
        disabled={canvasMode === "preview"}
        onClick={() => setRepositioning(!repositioning)}
      >
        <Move />
        {repositioning ? "Done repositioning" : "Reposition"}
      </Button>
      <div
        data-overridden={overridden ? true : undefined}
        className="flex min-h-6 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs data-overridden:border-l-2 data-overridden:border-primary data-overridden:pl-3"
      >
        {overridden ? (
          <>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Icon className="size-3" aria-hidden />
              Adjusted on {name}
            </span>
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Reset the ${name} image position to automatic`}
              onClick={() => clearOverride(deviceMode)}
            >
              <RotateCcw />
              Reset to automatic
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground">
            {image.recommended
              ? "Automatic position"
              : "Centred (no automatic position)"}
          </span>
        )}
      </div>
    </div>
  );
}

export function BackgroundControls() {
  const background = usePortalEditorStore((state) => state.config.background);
  const updateBackground = usePortalEditorStore(
    (state) => state.updateBackground,
  );
  const placeBackgroundImage = usePortalEditorStore(
    (state) => state.placeBackgroundImage,
  );
  const image = background.image;

  function updateImage(changes: Partial<BackgroundImage>) {
    if (image) updateBackground({ image: { ...image, ...changes } });
  }

  return (
    <div className="grid gap-4">
      <OptionToggle
        label="Background type"
        value={background.type}
        options={typeOptions}
        onChange={(type) => updateBackground({ type })}
      />
      <BackgroundColorControl />
      {background.type === "image" ? (
        <>
          <ImageUploadField
            label="Background image"
            src={image?.src ?? null}
            // TODO(.scratch/smart-crop/issues/02-smartcrop-recommendations.md): pass the analysed recommendation
            onUpload={(src) => placeBackgroundImage(src, null)}
            onRemove={() => updateBackground({ image: null })}
          />
          {image ? (
            <>
              <OptionToggle
                label="Image fit"
                value={image.fit}
                options={fitOptions}
                onChange={(fit) => updateImage({ fit })}
              />
              <PositionControls image={image} />
              <OverlayControls
                overlay={image.overlay}
                onChange={(overlay) => updateImage({ overlay })}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
