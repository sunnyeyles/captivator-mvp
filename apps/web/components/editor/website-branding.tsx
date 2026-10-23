"use client";

import { brandProfileSchema, type BrandProfile } from "@repo/portal";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  analyseBrandImage,
  preloadBackgroundAnalysis,
} from "@/lib/background-analysis";
import { reusableBrand, usePortalEditorStore } from "@/lib/editor-store";
import { websiteUrlSchema } from "@/lib/website-url";

const importResponseSchema = z.union([
  z.object({ brand: brandProfileSchema }),
  z.object({ error: z.object({ code: z.string(), message: z.string() }) }),
]);

const GENERIC_ERROR = "Something went wrong reading that site. Try again.";

export function WebsiteBranding({
  onBrandReady,
}: {
  onBrandReady: (brand: BrandProfile) => void;
}) {
  const setBrandDraft = usePortalEditorStore((state) => state.setBrandDraft);
  const shownBrand = usePortalEditorStore((state) => reusableBrand(state));
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const inputId = useId();
  const errorId = useId();

  function openDesigns(brand: BrandProfile) {
    setError(null);
    setBrandDraft(brand);
    onBrandReady(brand);
  }

  // Closing the dialog unmounts this form, so a running import has nowhere to report back
  useEffect(() => () => request.current?.abort(), []);

  async function importSite(href: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setPending(true);
    preloadBackgroundAnalysis();
    try {
      const response = await fetch("/api/brand-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: href }),
        signal: controller.signal,
      });
      const result = importResponseSchema.safeParse(await response.json());
      if (controller.signal.aborted) return;
      if (!result.success) setError(GENERIC_ERROR);
      else if ("error" in result.data) setError(result.data.error.message);
      else {
        const brand = await analyseBrandImage(result.data.brand);
        // A newer import, refresh or reuse aborted this one, so its analysis must not replace the newer draft
        if (!controller.signal.aborted) openDesigns(brand);
      }
    } catch {
      // A request replaced by a newer submit ends quietly
      if (!controller.signal.aborted) setError(GENERIC_ERROR);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = websiteUrlSchema.safeParse(url);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? GENERIC_ERROR);
      return;
    }
    // Reading the same site again would only repeat the wait, so Refresh from website is the one way to re-read it
    const known = reusableBrand(
      usePortalEditorStore.getState(),
      parsed.data.href,
    );
    if (!known) {
      void importSite(parsed.data.href);
      return;
    }
    request.current?.abort();
    openDesigns(known);
  }

  return (
    <>
      <form noValidate className="grid gap-2" onSubmit={generate}>
        <Label htmlFor={inputId}>Website address</Label>
        <Input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          value={url}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            // The disabled button blocks Enter's implicit submit, but a new address should still replace the running request
            if (event.key === "Enter" && pending) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            "Generate designs"
          )}
        </Button>
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive empty:hidden"
        >
          {error}
        </p>
      </form>
      {shownBrand ? (
        <div className="grid gap-2">
          <p className="truncate text-sm text-muted-foreground">
            Branding from {new URL(shownBrand.sourceUrl).host}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDesigns(shownBrand)}
            >
              View designs
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void importSite(shownBrand.sourceUrl)}
            >
              <RefreshCw aria-hidden />
              Refresh from website
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
