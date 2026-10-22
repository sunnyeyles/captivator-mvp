"use client";

import { colorSchema } from "@repo/portal";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The native colour picker only accepts the six-digit form
function toSixDigitHex(color: string) {
  if (color.length !== 4) return color;
  return `#${[...color.slice(1)].map((digit) => digit + digit).join("")}`;
}

interface ColorFieldProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

export function ColorField({ label, color, onChange }: ColorFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const text = draft ?? color;
  const error =
    draft === null ? undefined : colorSchema.safeParse(draft).error?.issues[0];

  function handleTextChange(value: string) {
    setDraft(value);
    if (colorSchema.safeParse(value).success) onChange(value);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Pick ${label.toLowerCase()}`}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
          value={toSixDigitHex(color)}
          onChange={(event) => {
            setDraft(null);
            onChange(event.target.value);
          }}
        />
        <Input
          id={inputId}
          value={text}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => handleTextChange(event.target.value)}
          // Drop an unfinished value so the field shows the colour the canvas is actually using
          onBlur={() => setDraft(null)}
        />
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
