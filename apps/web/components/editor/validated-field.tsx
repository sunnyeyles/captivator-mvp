"use client";

import { useId, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Validator<T> {
  safeParse: (
    value: unknown,
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: { message: string }[] } };
}

interface ValidatedFieldProps<T extends string | number> extends Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "id"
> {
  label: string;
  value: T;
  schema: Validator<T>;
  onValueChange: (value: T) => void;
}

export function ValidatedField<T extends string | number>({
  label,
  value,
  schema,
  onValueChange,
  type,
  ...inputProps
}: ValidatedFieldProps<T>) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  // An empty number input reads as NaN so the schema reports it rather than treating it as zero
  function parse(raw: string) {
    if (type !== "number") return schema.safeParse(raw);
    return schema.safeParse(raw === "" ? Number.NaN : Number(raw));
  }

  const result = draft === null ? null : parse(draft);
  const error = result && !result.success ? result.error.issues[0] : undefined;

  function handleChange(raw: string) {
    setDraft(raw);
    const parsed = parse(raw);
    if (parsed.success) onValueChange(parsed.data);
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        {...inputProps}
        id={inputId}
        type={type}
        value={draft ?? value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => handleChange(event.target.value)}
        // Drop an invalid value so the field shows what the canvas is actually using
        onBlur={() => setDraft(null)}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
