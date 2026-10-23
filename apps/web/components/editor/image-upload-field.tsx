"use client";

import { imageTypes } from "@repo/portal";
import { ImagePlus, Trash2 } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { imageFileError } from "@/lib/images";
import { FieldError } from "./validated-draft";

interface ImageUploadFieldProps {
  label: string;
  src: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  // Replaces the format hint, for progress or results of handling the upload
  status?: ReactNode;
}

export function ImageUploadField({
  label,
  src,
  onUpload,
  onRemove,
  status,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();
  const errorId = useId();

  function handleFile(file: File | undefined) {
    if (!file) return;
    const message = imageFileError(file);
    setError(message);
    if (!message) onUpload(file);
  }

  return (
    <div
      // Contains the sr-only file input, which otherwise escapes the sidebar's scroll area and grows the page
      className="relative grid gap-2"
    >
      <Label asChild>
        <span id={labelId}>{label}</span>
      </Label>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/image cannot load browser object URLs
        <img
          src={src}
          alt=""
          className="h-20 w-full rounded-md border bg-muted object-contain"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-describedby={error ? errorId : undefined}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus />
          {src ? "Replace" : "Upload"}
        </Button>
        {src ? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => {
              setError(null);
              onRemove();
            }}
          >
            <Trash2 />
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={imageTypes.join(",")}
        aria-labelledby={labelId}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // Clears the input so choosing the same file again still fires a change
          event.target.value = "";
        }}
      />
      {error ? (
        <FieldError id={errorId} role="alert" message={error} />
      ) : (
        (status ?? (
          <p className="text-xs text-muted-foreground">
            PNG, JPEG or WebP, up to 5 MB
          </p>
        ))
      )}
    </div>
  );
}
