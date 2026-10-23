"use client";

import type { LucideIcon } from "lucide-react";
import { Label } from "@repo/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";

export interface ToggleOption<Value extends string | number> {
  value: Value;
  label: string;
  // Shown instead of the label, which then becomes the item's accessible name
  icon?: LucideIcon;
  disabled?: boolean;
}

export function OptionToggle<Value extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly ToggleOption<Value>[];
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
        // Radix values are strings, so numeric options round-trip through String
        value={String(value)}
        onValueChange={(next) => {
          // Radix emits an empty string when the active item is clicked again
          const option = options.find(
            (candidate) => String(candidate.value) === next,
          );
          if (option) onChange(option.value);
        }}
      >
        {options.map(({ value: optionValue, label, icon: Icon, disabled }) => (
          <ToggleGroupItem
            key={optionValue}
            value={String(optionValue)}
            disabled={disabled}
            aria-label={Icon ? label : undefined}
            className="flex-1 px-1 text-xs"
          >
            {Icon ? <Icon /> : label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
