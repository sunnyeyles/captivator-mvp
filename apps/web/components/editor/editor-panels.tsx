"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/resizable";

// Tailwind's md breakpoint, where the editor switches from stacked to side by side
const WIDE_QUERY = "(min-width: 48rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useIsWide() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

export function EditorPanels({
  properties,
  canvas,
  assistant,
}: {
  properties: ReactNode;
  canvas: ReactNode;
  assistant: ReactNode;
}) {
  const isWide = useIsWide();

  if (!isWide) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <aside
          aria-label="Properties"
          className="shrink-0 overflow-y-auto border-b bg-sidebar text-sidebar-foreground"
        >
          {properties}
        </aside>
        <main aria-label="Design canvas" className="min-h-0 min-w-0 flex-1">
          {canvas}
        </main>
        <aside
          aria-label="Design assistant"
          className="h-[28rem] shrink-0 border-t bg-sidebar text-sidebar-foreground"
        >
          {assistant}
        </aside>
      </div>
    );
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel
        defaultSize="18rem"
        minSize="16rem"
        maxSize="30rem"
        groupResizeBehavior="preserve-pixel-size"
      >
        <aside
          aria-label="Properties"
          className="h-full overflow-y-auto bg-sidebar text-sidebar-foreground"
        >
          {properties}
        </aside>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel minSize="30%">
        <main aria-label="Design canvas" className="h-full min-w-0">
          {canvas}
        </main>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize="20rem"
        minSize="16rem"
        maxSize="32rem"
        groupResizeBehavior="preserve-pixel-size"
      >
        <aside
          aria-label="Design assistant"
          className="h-full bg-sidebar text-sidebar-foreground"
        >
          {assistant}
        </aside>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
