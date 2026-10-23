"use client";

import { colorSchema } from "@repo/portal";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { FieldError, useValidatedDraft } from "./validated-draft";

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
  const { error, errorId, resetDraft, inputProps } = useValidatedDraft(
    colorSchema,
    color,
    onChange,
  );

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputProps.id}>{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`Pick ${label.toLowerCase()}`}
            className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
            value={toSixDigitHex(color)}
            onChange={(event) => {
              resetDraft();
              onChange(event.target.value);
            }}
          />
          <Input
            {...inputProps}
            className="h-8 w-24 font-mono text-xs"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
      <FieldError id={errorId} message={error?.message} />
    </div>
  );
}
