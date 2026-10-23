"use client";

import { useCurrentDesign } from "@/components/designs/design-loader";
import { DesignStatusBadge } from "@/components/designs/design-status-badge";
import { designStatus } from "@/lib/designs";

export function CurrentDesignStatus() {
  const { design, live } = useCurrentDesign();
  return <DesignStatusBadge status={designStatus(design, live)} />;
}
