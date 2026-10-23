import type { Device } from "@repo/portal";
import { Monitor, Smartphone, Tablet, type LucideIcon } from "lucide-react";

export const deviceDetails: Record<
  Device,
  { label: string; icon: LucideIcon }
> = {
  desktop: { label: "Desktop", icon: Monitor },
  tablet: { label: "Tablet", icon: Tablet },
  mobile: { label: "Mobile", icon: Smartphone },
};
