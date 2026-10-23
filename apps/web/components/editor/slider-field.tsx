"use client";

import { useId } from "react";
import { Label } from "@repo/ui/label";
import { Slider } from "@repo/ui/slider";

interface SliderFieldProps {
  label: string;
  unit: "px" | "%";
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
}

export function SliderField({
  label,
  unit,
  value,
  min,
  max,
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
        step={1}
        value={[value]}
        onValueChange={([next = value]) => onValueChange(next)}
      />
    </div>
  );
}
