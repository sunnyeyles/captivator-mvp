"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import {
  FullPageLoading,
  FullPageMessage,
} from "@/components/full-page-status";
import { designRepository, type Design, type LiveDesign } from "@/lib/designs";
import { usePortalEditorStore } from "@/lib/editor-store";

interface CurrentDesign {
  design: Design;
  setDesign: (design: Design) => void;
  live: LiveDesign | undefined;
  setLive: (live: LiveDesign | undefined) => void;
}

const CurrentDesignContext = createContext<CurrentDesign | null>(null);

export function useCurrentDesign() {
  const current = use(CurrentDesignContext);
  if (!current)
    throw new Error("useCurrentDesign needs a DesignLoader above it");
  return current;
}

// Mount with a key per id so a different design never shows the previous one while it loads
export function DesignLoader({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const [design, setDesign] = useState<Design | null | undefined>(undefined);
  const [live, setLive] = useState<LiveDesign | undefined>(undefined);

  useEffect(() => {
    let ignore = false;
    const repository = designRepository();
    void Promise.all([repository.get(id), repository.getLive()]).then(
      ([found, foundLive]) => {
        if (ignore) return;
        if (found) usePortalEditorStore.getState().loadDesign(found);
        setLive(foundLive);
        setDesign(found ?? null);
      },
    );
    return () => {
      ignore = true;
    };
  }, [id]);

  if (design === undefined) {
    return <FullPageLoading label="Loading design…" />;
  }

  if (design === null) {
    return (
      <FullPageMessage
        title="Design not found"
        description="It may have been deleted, or the link is wrong."
      />
    );
  }

  return (
    <CurrentDesignContext value={{ design, setDesign, live, setLive }}>
      {children}
    </CurrentDesignContext>
  );
}
