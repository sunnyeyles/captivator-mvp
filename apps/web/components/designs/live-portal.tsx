"use client";

import { SplashPage, type Device } from "@repo/portal";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  FullPageLoading,
  FullPageMessage,
} from "@/components/full-page-status";
import { designRepository, type LiveDesign } from "@/lib/designs";

function viewportDevice(): Device {
  if (window.innerWidth < 768) return "mobile";
  return window.innerWidth < 1024 ? "tablet" : "desktop";
}

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

export function LivePortal() {
  const [live, setLive] = useState<LiveDesign | null | undefined>(undefined);
  const device = useSyncExternalStore<Device>(
    subscribeToResize,
    viewportDevice,
    () => "mobile",
  );

  useEffect(() => {
    let ignore = false;
    void designRepository()
      .getLive()
      .then((found) => {
        if (!ignore) setLive(found ?? null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (live === undefined) {
    return <FullPageLoading label="Loading live page…" />;
  }

  if (live === null) {
    return (
      <FullPageMessage
        title="Nothing is live"
        description="Publish a design to make it the page guests see."
      />
    );
  }

  return (
    <main aria-label={`${live.designName}, live`} className="h-dvh">
      <SplashPage config={live.config} device={device} mode="published" />
    </main>
  );
}
