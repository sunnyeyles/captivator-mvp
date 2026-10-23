"use client";

import { layoutDefaults, SPACE_ABOVE_MAX, SPACE_ABOVE_MIN } from "@repo/portal";
import { useId } from "react";
import { Label } from "@repo/ui/label";
import { Slider } from "@repo/ui/slider";

interface SliderFieldProps {
  label: string;
  unit: "px" | "%";
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
}

export function SliderField({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onValueChange,
}: SliderFieldProps) {
  const labelId = useId();

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label id={labelId}>{label}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        aria-labelledby={labelId}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next = value]) => onValueChange(next)}
      />
    </div>
  );
}

export function SpaceAboveSlider({
  value,
  onValueChange,
}: {
  value: number | undefined;
  onValueChange: (spaceAbove: number) => void;
}) {
  return (
    <SliderField
      label="Space above"
      unit="px"
      value={value ?? layoutDefaults.spaceAbove}
      min={SPACE_ABOVE_MIN}
      max={SPACE_ABOVE_MAX}
      onValueChange={onValueChange}
    />
  );
}
