"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/collapsible";

export function LayoutSection({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="grid gap-4">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group -ml-2 justify-self-start"
        >
          <ChevronRight className="transition-transform group-data-[state=open]:rotate-90" />
          Layout
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
