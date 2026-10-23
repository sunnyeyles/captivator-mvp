"use client";

import { brandProfileSchema } from "@repo/portal";
import { LoaderCircle } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalEditorStore } from "@/lib/editor-store";
import { websiteUrlSchema } from "@/lib/website-url";
import { BrandDesignChooser } from "./brand-design-chooser";

const importResponseSchema = z.union([
  z.object({ brand: brandProfileSchema }),
  z.object({ error: z.object({ code: z.string(), message: z.string() }) }),
]);

const GENERIC_ERROR = "Something went wrong reading that site. Try again.";

export function WebsiteBranding() {
  const setBrandDraft = usePortalEditorStore((state) => state.setBrandDraft);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  const inputId = useId();
  const errorId = useId();

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = websiteUrlSchema.safeParse(url);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? GENERIC_ERROR);
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/brand-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsed.data.href }),
        signal: controller.signal,
      });
      const result = importResponseSchema.safeParse(await response.json());
      if (controller.signal.aborted) return;
      if (!result.success) setError(GENERIC_ERROR);
      else if ("error" in result.data) setError(result.data.error.message);
      else {
        setBrandDraft(result.data.brand);
        setChooserOpen(true);
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
      <BrandDesignChooser open={chooserOpen} onOpenChange={setChooserOpen} />
    </>
  );
}
