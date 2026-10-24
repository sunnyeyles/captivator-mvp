"use client";

import { LayoutTemplate } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { designRepository, type Design, type LiveDesign } from "@/lib/designs";
import { DesignCard } from "./design-card";
import { NewDesignDialog } from "./new-design-dialog";

interface Library {
  designs: Design[];
  live: LiveDesign | undefined;
}

async function loadLibrary(): Promise<Library> {
  const repository = designRepository();
  const [designs, live] = await Promise.all([
    repository.list(),
    repository.getLive(),
  ]);
  return { designs, live };
}

function LibraryHeader({ action }: { action?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4">
      <h1 className="text-xl font-semibold">Designs</h1>
      {action}
    </div>
  );
}

export function DesignsLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);

  const refresh = useCallback(async () => {
    setLibrary(await loadLibrary());
  }, []);

  useEffect(() => {
    let ignore = false;
    void loadLibrary().then((loaded) => {
      if (!ignore) setLibrary(loaded);
    });
    return () => {
      ignore = true;
    };
  }, []);

  if (!library) {
    return (
      <>
        <LibraryHeader />
        <p
          role="status"
          className="py-24 text-center text-sm text-muted-foreground"
        >
          Loading designs…
        </p>
      </>
    );
  }

  const { designs, live } = library;

  if (designs.length === 0) {
    return (
      <>
        <LibraryHeader />
        <div className="grid justify-items-center gap-4 rounded-lg border border-dashed px-6 py-24 text-center">
          <LayoutTemplate
            className="size-8 text-muted-foreground"
            aria-hidden
          />
          <div className="grid gap-1">
            <h2 className="font-semibold">No designs yet</h2>
            <p className="text-sm text-muted-foreground">
              Start from your website or a template and make it your own.
            </p>
          </div>
          <NewDesignDialog />
        </div>
      </>
    );
  }

  return (
    <>
      <LibraryHeader action={<NewDesignDialog />} />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
        {designs.map((design) => (
          <DesignCard
            key={design.id}
            design={design}
            live={live}
            onChange={refresh}
          />
        ))}
      </ul>
    </>
  );
}
