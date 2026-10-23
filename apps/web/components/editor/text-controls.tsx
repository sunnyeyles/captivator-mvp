"use client";

import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  layoutDefaults,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  textElementSchema,
  type TextElement,
} from "@repo/portal";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { ValidatedField } from "./validated-field";

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
      <FontSizeField
        // Remounts on a device switch so no draft carries across
        key={`font-size-${deviceMode}`}
        fontSize={resolved.fontSize}
        onChange={(fontSize) => updateText(text.id, { fontSize })}
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
      <ValidatedField
        key={`space-above-${deviceMode}`}
        label="Space above (px)"
        type="number"
        inputMode="numeric"
        min={SPACE_ABOVE_MIN}
        max={SPACE_ABOVE_MAX}
        step={1}
        value={resolved.spaceAbove ?? layoutDefaults.spaceAbove}
        schema={textElementSchema.shape.spaceAbove.unwrap()}
        onValueChange={(spaceAbove) => updateText(text.id, { spaceAbove })}
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
