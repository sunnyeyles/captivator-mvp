"use client";

import { SplashPage, type Device } from "@repo/portal";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { usePortalEditorStore } from "@/lib/editor-store";

const frameSizes: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

const WORKSPACE_PADDING = 32;

// The renderer only marks selectable and selected elements, so the indicator's look stays in the editor theme
const selectionIndicator = [
  "[&_[data-element-id]]:cursor-pointer",
  "[&_[data-element-id]]:outline-editor-selection",
  "[&_[data-element-id]]:outline-offset-(--selection-offset)",
  "[&_[data-element-id]:not([data-selected]):hover]:outline-dashed",
  "[&_[data-element-id]:not([data-selected]):hover]:outline-(length:--selection-outline)",
  "[&_[data-element-id]:focus-visible]:outline-solid",
  "[&_[data-element-id]:focus-visible]:outline-(length:--selection-outline)",
  "[&_[data-selected]]:outline-solid",
  "[&_[data-selected]]:outline-(length:--selection-outline)",
].join(" ");

function scaledFrameStyle(
  frame: { width: number; height: number },
  scale: number,
): CSSProperties & Record<`--${string}`, string> {
  return {
    width: frame.width,
    height: frame.height,
    transform: `scale(${scale})`,
    // Divided by the scale so the indicator keeps the same on-screen thickness at any zoom
    "--selection-outline": `${2 / scale}px`,
    "--selection-offset": `${4 / scale}px`,
  };
}

export function DesignCanvas() {
  const config = usePortalEditorStore((state) => state.config);
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const canvasMode = usePortalEditorStore((state) => state.canvasMode);
  const selectedElementId = usePortalEditorStore(
    (state) => state.selectedElementId,
  );
  const selectElement = usePortalEditorStore((state) => state.selectElement);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspace, setWorkspace] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setWorkspace({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const frame = frameSizes[deviceMode];
  // Scale the whole frame rather than resizing it, so the design's own layout never changes
  const scale = workspace
    ? Math.min(
        (workspace.width - WORKSPACE_PADDING * 2) / frame.width,
        (workspace.height - WORKSPACE_PADDING * 2) / frame.height,
        1,
      )
    : 0;

  return (
    <div
      ref={workspaceRef}
      className="flex size-full min-h-80 items-center justify-center overflow-hidden bg-editor-canvas"
      onClick={(event) => {
        if (event.target === event.currentTarget) selectElement(null);
      }}
    >
      {scale > 0 ? (
        <div
          className="shrink-0 overflow-hidden rounded-lg shadow-lg ring-1 ring-border data-[device=mobile]:rounded-[2rem] data-[device=tablet]:rounded-[1.5rem]"
          data-device={deviceMode}
          style={{ width: frame.width * scale, height: frame.height * scale }}
        >
          <div
            className={`origin-top-left ${selectionIndicator}`}
            style={scaledFrameStyle(frame, scale)}
          >
            <SplashPage
              config={config}
              device={deviceMode}
              mode={canvasMode}
              selectedElementId={selectedElementId}
              onSelectElement={selectElement}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
