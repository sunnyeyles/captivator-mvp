"use client";

import type { Device } from "@repo/portal";
import { Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const devices: Record<Device, { name: string; icon: typeof Monitor }> = {
  desktop: { name: "desktop", icon: Monitor },
  tablet: { name: "tablet", icon: Tablet },
  mobile: { name: "mobile", icon: Smartphone },
};

interface DeviceOverrideFieldProps {
  property: string;
  device: Device;
  overridden: boolean;
  onOverride: () => void;
  onClear: () => void;
  children: ReactNode;
}

// Wraps a style control so overriding it for the active device is an explicit choice, never a side effect of editing
export function DeviceOverrideField({
  property,
  device,
  overridden,
  onOverride,
  onClear,
  children,
}: DeviceOverrideFieldProps) {
  const { name, icon: Icon } = devices[device];

  return (
    <div
      data-overridden={overridden ? true : undefined}
      className="grid gap-1.5 data-overridden:border-l-2 data-overridden:border-primary data-overridden:pl-3"
    >
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2 text-xs">
        {overridden ? (
          <>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <Icon className="size-3" aria-hidden />
              Overridden on {name}
            </span>
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Clear the ${name} ${property} override`}
              onClick={onClear}
            >
              <RotateCcw />
              Use shared
            </Button>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Shared by all devices</span>
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Override ${property} on ${name}`}
              onClick={onOverride}
            >
              <Icon />
              Override on {name}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
