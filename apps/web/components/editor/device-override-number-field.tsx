"use client";

import type { Device } from "@repo/portal";
import { DeviceOverrideField } from "./device-override-field";
import { ValidatedField, type Validator } from "./validated-field";

interface DeviceOverrideNumberFieldProps {
  label: string;
  property: string;
  device: Device;
  overridden: boolean;
  value: number;
  min: number;
  max: number;
  schema: Validator<number>;
  onOverride: () => void;
  onClear: () => void;
  onValueChange: (value: number) => void;
}

export function DeviceOverrideNumberField({
  label,
  property,
  device,
  overridden,
  value,
  min,
  max,
  schema,
  onOverride,
  onClear,
  onValueChange,
}: DeviceOverrideNumberFieldProps) {
  return (
    <DeviceOverrideField
      property={property}
      device={device}
      overridden={overridden}
      onOverride={onOverride}
      onClear={onClear}
    >
      <ValidatedField
        // Remounts when the edited value switches between shared and override so no draft carries across
        key={`${device}-${overridden}`}
        label={label}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        schema={schema}
        onValueChange={onValueChange}
      />
    </DeviceOverrideField>
  );
}
