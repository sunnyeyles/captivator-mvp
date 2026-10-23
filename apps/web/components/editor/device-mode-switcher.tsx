"use client";

import { devices, type Device } from "@repo/portal";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";

function isDevice(value: string): value is Device {
  return devices.some((device) => device === value);
}

interface DeviceToggleProps {
  label: string;
  value: Device;
  onValueChange: (device: Device) => void;
}

export function DeviceToggle({
  label,
  value,
  onValueChange,
}: DeviceToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label={label}
      value={value}
      // Radix emits an empty string when the active item is clicked again, which would leave no mode selected
      onValueChange={(next) => isDevice(next) && onValueChange(next)}
    >
      <ToggleGroupItem value="desktop" aria-label="Desktop">
        <Monitor />
        Desktop
      </ToggleGroupItem>
      <ToggleGroupItem value="tablet" aria-label="Tablet">
        <Tablet />
        Tablet
      </ToggleGroupItem>
      <ToggleGroupItem value="mobile" aria-label="Mobile">
        <Smartphone />
        Mobile
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function DeviceModeSwitcher() {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const setDeviceMode = usePortalEditorStore((state) => state.setDeviceMode);

  return (
    <DeviceToggle
      label="Device mode"
      value={deviceMode}
      onValueChange={setDeviceMode}
    />
  );
}
