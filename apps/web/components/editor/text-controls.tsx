"use client";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  layoutDefaults,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  textElementSchema,
  type StyleOverride,
  type TextElement,
} from "@repo/portal";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { DeviceOverrideField } from "./device-override-field";
import { DeviceOverrideNumberField } from "./device-override-number-field";

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

function FontSizeField({
  fontSize,
  onChange,
}: {
  fontSize: number;
  onChange: (fontSize: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const fontSizeSchema = textElementSchema.shape.fontSize;

  const error =
    draft === null
      ? undefined
      : fontSizeSchema.safeParse(draft === "" ? Number.NaN : Number(draft))
          .error?.issues[0];

  function handleChange(value: string) {
    setDraft(value);
    const parsed = fontSizeSchema.safeParse(
      value === "" ? Number.NaN : Number(value),
    );
    if (parsed.success) onChange(parsed.data);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>Font size (px)</Label>
      <Input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={FONT_SIZE_MIN}
        max={FONT_SIZE_MAX}
        step={1}
        value={draft ?? fontSize}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => handleChange(event.target.value)}
        // Drop an out-of-range value so the field shows the size the canvas is actually using
        onBlur={() => setDraft(null)}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

export function TextControls({ text }: { text: TextElement }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateText = usePortalEditorStore((state) => state.updateText);
  const overrideText = usePortalEditorStore((state) => state.overrideText);
  const clearTextOverride = usePortalEditorStore(
    (state) => state.clearTextOverride,
  );
  const removeText = usePortalEditorStore((state) => state.removeText);
  const contentId = useId();

  const resolved = resolveForDevice(text, deviceMode);
  const deviceOverride = text.overrides?.[deviceMode];
  const fontSizeOverridden = deviceOverride?.fontSize !== undefined;
  const textAlignOverridden = deviceOverride?.textAlign !== undefined;
  const spaceAboveOverridden = deviceOverride?.spaceAbove !== undefined;
  const sharedSpaceAbove = text.spaceAbove ?? layoutDefaults.spaceAbove;

  // An overridable control edits the active device's override once one exists, and the shared value otherwise
  function updateStyle(
    overridden: boolean,
    changes: StyleOverride<TextElement>,
  ) {
    if (overridden) overrideText(text.id, deviceMode, changes);
    else updateText(text.id, changes);
  }

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
      <DeviceOverrideField
        property="font size"
        device={deviceMode}
        overridden={fontSizeOverridden}
        onOverride={() =>
          overrideText(text.id, deviceMode, { fontSize: text.fontSize })
        }
        onClear={() => clearTextOverride(text.id, deviceMode, "fontSize")}
      >
        <FontSizeField
          // Remounts when the edited value switches between shared and override so no draft carries across
          key={`${deviceMode}-${fontSizeOverridden}`}
          fontSize={resolved.fontSize}
          onChange={(fontSize) => updateStyle(fontSizeOverridden, { fontSize })}
        />
      </DeviceOverrideField>
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
      <DeviceOverrideField
        property="alignment"
        device={deviceMode}
        overridden={textAlignOverridden}
        onOverride={() =>
          overrideText(text.id, deviceMode, { textAlign: text.textAlign })
        }
        onClear={() => clearTextOverride(text.id, deviceMode, "textAlign")}
      >
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
            if (option) {
              updateStyle(textAlignOverridden, { textAlign: option.value });
            }
          }}
        >
          {alignOptions.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem key={value} value={value} aria-label={label}>
              <Icon />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </DeviceOverrideField>
      <DeviceOverrideNumberField
        label="Space above (px)"
        property="space above"
        device={deviceMode}
        overridden={spaceAboveOverridden}
        value={resolved.spaceAbove ?? sharedSpaceAbove}
        min={SPACE_ABOVE_MIN}
        max={SPACE_ABOVE_MAX}
        schema={textElementSchema.shape.spaceAbove.unwrap()}
        onOverride={() =>
          overrideText(text.id, deviceMode, { spaceAbove: sharedSpaceAbove })
        }
        onClear={() => clearTextOverride(text.id, deviceMode, "spaceAbove")}
        onValueChange={(spaceAbove) =>
          updateStyle(spaceAboveOverridden, { spaceAbove })
        }
      />
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
