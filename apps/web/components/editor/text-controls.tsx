"use client";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  fontWeights,
  resolveForDevice,
  textAligns,
  type TextElement,
} from "@repo/portal";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { useId } from "react";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { LayoutSection } from "./layout-section";
import { OptionToggle, type ToggleOption } from "./option-toggle";
import { RemoveButton } from "./remove-button";
import { SliderField, SpaceAboveSlider } from "./slider-field";

const weightLabels: Record<TextElement["fontWeight"], string> = {
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
};

const weightOptions = fontWeights.map((value) => ({
  value,
  label: weightLabels[value],
}));

const alignDetails: Record<
  TextElement["textAlign"],
  Omit<ToggleOption<TextElement["textAlign"]>, "value">
> = {
  left: { label: "Align left", icon: AlignLeft },
  center: { label: "Align centre", icon: AlignCenter },
  right: { label: "Align right", icon: AlignRight },
};

const alignOptions = textAligns.map((value) => ({
  value,
  ...alignDetails[value],
}));

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
      <OptionToggle
        label="Font weight"
        value={text.fontWeight}
        options={weightOptions}
        onChange={(fontWeight) => updateText(text.id, { fontWeight })}
      />
      <OptionToggle
        label="Alignment"
        value={resolved.textAlign}
        options={alignOptions}
        onChange={(textAlign) => updateText(text.id, { textAlign })}
      />
      <LayoutSection>
        <SpaceAboveSlider
          value={resolved.spaceAbove}
          onValueChange={(spaceAbove) => updateText(text.id, { spaceAbove })}
        />
      </LayoutSection>
      <RemoveButton label="Remove text" onClick={() => removeText(text.id)} />
    </div>
  );
}
