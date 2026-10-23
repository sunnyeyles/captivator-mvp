"use client";

import { brandProfileSchema, type BrandProfile } from "@repo/portal";
import { LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  analyseBrandImage,
  preloadBackgroundAnalysis,
} from "@/lib/background-analysis";
import { websiteUrlSchema } from "@/lib/website-url";

const importResponseSchema = z.union([
  z.object({ brand: brandProfileSchema }),
  z.object({ error: z.object({ code: z.string(), message: z.string() }) }),
]);

const GENERIC_ERROR = "Something went wrong reading that site. Try again.";

export function useBrandImport(onBrand: (brand: BrandProfile) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  // Unmounting leaves a running import nowhere to report back
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
        // A newer import, refresh or reuse aborted this one, so its analysis must not replace the newer brand
        if (!controller.signal.aborted) onBrand(brand);
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

  function cancel() {
    request.current?.abort();
  }

  return { pending, error, setError, importSite, cancel };
}

export function WebsiteUrlForm({
  importer,
  onSubmit,
  submitLabel = "Generate designs",
  disabled = false,
}: {
  importer: ReturnType<typeof useBrandImport>;
  onSubmit: (href: string) => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const { pending, error, setError } = importer;
  const [url, setUrl] = useState("");
  const inputId = useId();
  const errorId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const parsed = websiteUrlSchema.safeParse(url);
    if (parsed.success) onSubmit(parsed.data.href);
    else setError(parsed.error.issues[0]?.message ?? GENERIC_ERROR);
  }

  return (
    <form noValidate className="grid gap-2" onSubmit={submit}>
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
      <Button type="submit" disabled={pending || disabled}>
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" aria-hidden />
            Generating…
          </>
        ) : (
          submitLabel
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
  );
}
