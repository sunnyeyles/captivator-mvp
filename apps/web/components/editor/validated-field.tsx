"use client";

import type { ComponentProps } from "react";
import type { z } from "zod";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { FieldError, useValidatedDraft } from "./validated-draft";

interface ValidatedFieldProps extends Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur" | "id"
> {
  label: string;
  value: string;
  schema: z.ZodType<string>;
  onValueChange: (value: string) => void;
}

export function ValidatedField({
  label,
  value,
  schema,
  onValueChange,
  ...props
}: ValidatedFieldProps) {
  const { error, errorId, inputProps } = useValidatedDraft(
    schema,
    value,
    onValueChange,
  );

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputProps.id}>{label}</Label>
      <Input {...props} {...inputProps} />
      <FieldError id={errorId} message={error?.message} />
    </div>
  );
}
