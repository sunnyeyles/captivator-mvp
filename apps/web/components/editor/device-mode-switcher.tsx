"use client";

import { devices, type Device } from "@repo/portal";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { deviceDetails } from "./devices";

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
      {devices.map((device) => {
        const { label, icon: Icon } = deviceDetails[device];
        return (
          <ToggleGroupItem key={device} value={device} aria-label={label}>
            <Icon />
            {label}
          </ToggleGroupItem>
        );
      })}
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
