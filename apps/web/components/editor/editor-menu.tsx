"use client";

import { MoreHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@repo/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { isAtTemplateDefaults, usePortalEditorStore } from "@/lib/editor-store";

export function EditorMenu() {
  const atTemplateDefaults = usePortalEditorStore(isAtTemplateDefaults);
  const reset = usePortalEditorStore((state) => state.reset);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="More actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Reset is one undo step, so it needs no confirmation */}
        <DropdownMenuItem disabled={atTemplateDefaults} onSelect={reset}>
          <RotateCcw />
          Reset to template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
