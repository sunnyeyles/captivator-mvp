"use client";

import {
  ELEMENT_WIDTH_MAX,
  ELEMENT_WIDTH_MIN,
  GUEST_FIELD_LABEL_MAX,
  GUEST_FIELD_PLACEHOLDER_MAX,
  guestFieldDefaults,
  guestFieldTypes,
  layoutDefaults,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  type GuestField,
  type GuestFieldType,
} from "@repo/portal";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { LayoutSection } from "./layout-section";
import { SliderField } from "./slider-field";

function isGuestFieldType(value: string): value is GuestFieldType {
  return guestFieldTypes.some((type) => type === value);
}

export function GuestFieldControls({ field }: { field: GuestField }) {
  const fields = usePortalEditorStore((state) => state.config.fields);
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateField = usePortalEditorStore((state) => state.updateField);
  const removeField = usePortalEditorStore((state) => state.removeField);
  const labelId = useId();
  const placeholderId = useId();
  const defaults = guestFieldDefaults[field.type];

  const resolved = resolveForDevice(field, deviceMode);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label asChild>
          <span>Asks for</span>
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Field type"
          className="w-full"
          value={field.type}
          // Radix emits an empty string when the active item is clicked again, which would clear the type
          onValueChange={(value) =>
            isGuestFieldType(value) && updateField(field.id, { type: value })
          }
        >
          {guestFieldTypes.map((type) => (
            <ToggleGroupItem
              key={type}
              value={type}
              className="flex-1"
              // A page asks for each kind of guest detail once
              disabled={fields.some(
                (other) => other.id !== field.id && other.type === type,
              )}
            >
              {guestFieldDefaults[type].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
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
      <LayoutSection>
        <SliderField
          label="Width"
          unit="%"
          value={resolved.width ?? layoutDefaults.fieldWidth}
          min={ELEMENT_WIDTH_MIN}
          max={ELEMENT_WIDTH_MAX}
          onValueChange={(width) => updateField(field.id, { width })}
        />
        <SliderField
          label="Space above"
          unit="px"
          value={resolved.spaceAbove ?? layoutDefaults.spaceAbove}
          min={SPACE_ABOVE_MIN}
          max={SPACE_ABOVE_MAX}
          onValueChange={(spaceAbove) => updateField(field.id, { spaceAbove })}
        />
      </LayoutSection>
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
