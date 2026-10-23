"use client";

import { useId, useState } from "react";
import type { z } from "zod";

// Holds an unfinished value locally and only reports it once the schema accepts it
export function useValidatedDraft(
  schema: z.ZodType<string>,
  value: string,
  onChange: (value: string) => void,
) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const error =
    draft === null ? undefined : schema.safeParse(draft).error?.issues[0];

  return {
    error,
    errorId,
    resetDraft: () => setDraft(null),
    inputProps: {
      id: inputId,
      value: draft ?? value,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
      onChange: (event: { target: { value: string } }) => {
        const raw = event.target.value;
        setDraft(raw);
        const parsed = schema.safeParse(raw);
        if (parsed.success) onChange(parsed.data);
      },
      // Drop an unfinished value so the field shows what the canvas is actually using
      onBlur: () => setDraft(null),
    },
  };
}

export function FieldError({
  id,
  message,
  role,
}: {
  id: string;
  message: string | null | undefined;
  role?: "alert";
}) {
  if (!message) return null;
  return (
    <p id={id} role={role} className="text-sm text-destructive">
      {message}
    </p>
  );
}
