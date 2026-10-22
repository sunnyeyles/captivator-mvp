"use client";

import {
  GUEST_FIELD_LABEL_MAX,
  GUEST_FIELD_PLACEHOLDER_MAX,
  guestFieldDefaults,
  type GuestField,
} from "@repo/portal";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";

export function GuestFieldControls({ field }: { field: GuestField }) {
  const updateField = usePortalEditorStore((state) => state.updateField);
  const removeField = usePortalEditorStore((state) => state.removeField);
  const labelId = useId();
  const placeholderId = useId();
  const defaults = guestFieldDefaults[field.type];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          value={field.label ?? ""}
          // Shown greyed out so an empty box still tells the user what guests will see
          placeholder={defaults.label}
          maxLength={GUEST_FIELD_LABEL_MAX}
          autoComplete="off"
          onChange={(event) =>
            updateField(field.id, { label: event.target.value || undefined })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={placeholderId}>Placeholder</Label>
        <Input
          id={placeholderId}
          value={field.placeholder ?? ""}
          placeholder={defaults.placeholder}
          maxLength={GUEST_FIELD_PLACEHOLDER_MAX}
          autoComplete="off"
          onChange={(event) =>
            updateField(field.id, {
              placeholder: event.target.value || undefined,
            })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label asChild>
          <span>Guests must fill it in</span>
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Required"
          className="w-full"
          value={field.required ? "required" : "optional"}
          onValueChange={(value) =>
            value && updateField(field.id, { required: value === "required" })
          }
        >
          <ToggleGroupItem value="optional" className="flex-1">
            Optional
          </ToggleGroupItem>
          <ToggleGroupItem value="required" className="flex-1">
            Required
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start text-destructive"
        onClick={() => removeField(field.id)}
      >
        <Trash2 />
        Remove field
      </Button>
    </div>
  );
}
