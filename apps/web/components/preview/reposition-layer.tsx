"use client";

import {
  resolveBackgroundImage,
  type BackgroundImage,
  type BackgroundPosition,
  type Device,
} from "@repo/portal";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  dragPosition,
  nudgePosition,
  type Size,
} from "@/lib/background-geometry";
import { usePortalEditorStore } from "@/lib/editor-store";

// Kept per src so device switches and repeat sessions never reload an image just to measure it
const naturalSizes = new Map<string, Size>();

function useNaturalSize(src: string) {
  const [, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (naturalSizes.has(src)) return;
    const image = new Image();
    image.onload = () => {
      naturalSizes.set(src, {
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setLoaded(src);
    };
    image.src = src;
    return () => {
      image.onload = null;
    };
  }, [src]);

  return naturalSizes.get(src) ?? null;
}

interface RepositionLayerProps {
  image: BackgroundImage;
  device: Device;
  frame: Size;
  scale: number;
}

// Editor UI over the scaled frame rather than renderer code, so customer branding never styles it
export function RepositionLayer({
  image,
  device,
  frame,
  scale,
}: RepositionLayerProps) {
  const overridePosition = usePortalEditorStore(
    (state) => state.overrideBackgroundPosition,
  );
  const setRepositioning = usePortalEditorStore(
    (state) => state.setRepositioning,
  );
  const natural = useNaturalSize(image.src);
  const layerRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [drag, setDrag] = useState<{
    pointerId: number;
    clientX: number;
    clientY: number;
    start: BackgroundPosition;
  } | null>(null);
  const position = resolveBackgroundImage(image, device).position;
  const geometry = natural && { frame, natural, fit: image.fit };

  useEffect(() => {
    layerRef.current?.focus();
  }, []);

  // A move along an axis with nothing cropped would otherwise mark the device as adjusted
  function moveTo(next: BackgroundPosition) {
    if (next.x !== position.x || next.y !== position.y) {
      overridePosition(device, next);
    }
  }

  return (
    <div
      ref={layerRef}
      role="application"
      aria-label="Background image position"
      aria-describedby={hintId}
      tabIndex={0}
      data-dragging={drag ? true : undefined}
      className="absolute inset-0 cursor-grab touch-none outline-2 -outline-offset-2 outline-editor-selection outline-solid focus-visible:outline-4 data-dragging:cursor-grabbing"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          start: position,
        });
      }}
      onPointerMove={(event) => {
        if (!drag || drag.pointerId !== event.pointerId || !geometry) return;
        moveTo(
          dragPosition(
            drag.start,
            {
              x: event.clientX - drag.clientX,
              y: event.clientY - drag.clientY,
            },
            scale,
            geometry,
          ),
        );
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Enter") {
          event.preventDefault();
          setRepositioning(false);
          return;
        }
        if (!geometry) return;
        const next = nudgePosition(
          position,
          event.key,
          event.shiftKey,
          geometry,
        );
        if (!next) return;
        event.preventDefault();
        moveTo(next);
      }}
    >
      <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
        <div className="flex items-center gap-2 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
          <span id={hintId}>
            Drag to reposition · Esc to finish
            <span className="sr-only">
              . Arrow keys move the image, and Shift with an arrow moves it
              further
            </span>
          </span>
          <Button
            size="xs"
            // Stops the press from starting a drag underneath the button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setRepositioning(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
