"use client";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  layoutDefaults,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  type TextElement,
} from "@repo/portal";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { LayoutSection } from "./layout-section";
import { SliderField } from "./slider-field";

const weightOptions: { value: TextElement["fontWeight"]; label: string }[] = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
];

const alignOptions = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align centre", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
] as const satisfies {
  value: TextElement["textAlign"];
  label: string;
  icon: unknown;
}[];

export function TextControls({ text }: { text: TextElement }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateText = usePortalEditorStore((state) => state.updateText);
  const removeText = usePortalEditorStore((state) => state.removeText);
  const contentId = useId();

  const resolved = resolveForDevice(text, deviceMode);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={contentId}>Text</Label>
        <Textarea
          id={contentId}
          value={text.text}
          onChange={(event) =>
            updateText(text.id, { text: event.target.value })
          }
        />
      </div>
      <ColorField
        label="Text colour"
        color={text.color}
        onChange={(color) => updateText(text.id, { color })}
      />
      <SliderField
        label="Font size"
        unit="px"
        value={resolved.fontSize}
        min={FONT_SIZE_MIN}
        max={FONT_SIZE_MAX}
        onValueChange={(fontSize) => updateText(text.id, { fontSize })}
      />
      <div className="grid gap-2">
        <Label asChild>
          <span>Font weight</span>
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Font weight"
          className="w-full"
          value={String(text.fontWeight)}
          onValueChange={(value) => {
            const option = weightOptions.find(
              (candidate) => String(candidate.value) === value,
            );
            if (option) updateText(text.id, { fontWeight: option.value });
          }}
        >
          {weightOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={String(option.value)}
              className="flex-1 px-1 text-xs"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid gap-2">
        <Label asChild>
          <span>Alignment</span>
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Alignment"
          value={resolved.textAlign}
          onValueChange={(value) => {
            const option = alignOptions.find(
              (candidate) => candidate.value === value,
            );
            if (option) updateText(text.id, { textAlign: option.value });
          }}
        >
          {alignOptions.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} aria-label={label}>
              <Icon />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <LayoutSection>
        <SliderField
          label="Space above"
          unit="px"
          value={resolved.spaceAbove ?? layoutDefaults.spaceAbove}
          min={SPACE_ABOVE_MIN}
          max={SPACE_ABOVE_MAX}
          onValueChange={(spaceAbove) => updateText(text.id, { spaceAbove })}
        />
      </LayoutSection>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start text-destructive"
        onClick={() => removeText(text.id)}
      >
        <Trash2 />
        Remove text
      </Button>
    </div>
  );
}
