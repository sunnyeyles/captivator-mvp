"use client";

import { SplashPage, type Device } from "@repo/portal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
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
    return (
      <p
        role="status"
        className="grid h-dvh place-items-center text-sm text-muted-foreground"
      >
        Loading live page…
      </p>
    );
  }

  if (live === null) {
    return (
      <main className="grid h-dvh place-content-center justify-items-center gap-4 text-center">
        <h1 className="text-lg font-semibold">Nothing is live</h1>
        <p className="text-sm text-muted-foreground">
          Publish a design to make it the page guests see.
        </p>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft aria-hidden />
            Back to designs
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main aria-label={`${live.designName}, live`} className="h-dvh">
      <SplashPage config={live.config} device={device} mode="published" />
    </main>
  );
}
