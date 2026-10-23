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
  type GuestField,
} from "@repo/portal";
import { useId } from "react";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { usePortalEditorStore } from "@/lib/editor-store";
import { LayoutSection } from "./layout-section";
import { OptionToggle } from "./option-toggle";
import { RemoveButton } from "./remove-button";
import { SliderField, SpaceAboveSlider } from "./slider-field";

const requiredOptions = [
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
] as const;

export function GuestFieldControls({ field }: { field: GuestField }) {
  const fields = usePortalEditorStore((state) => state.config.fields);
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateField = usePortalEditorStore((state) => state.updateField);
  const removeField = usePortalEditorStore((state) => state.removeField);
  const labelId = useId();
  const placeholderId = useId();
  const defaults = guestFieldDefaults[field.type];

  const resolved = resolveForDevice(field, deviceMode);
  const typeOptions = guestFieldTypes.map((type) => ({
    value: type,
    label: guestFieldDefaults[type].label,
    // A page asks for each kind of guest detail once
    disabled: fields.some(
      (other) => other.id !== field.id && other.type === type,
    ),
  }));

  return (
    <div className="grid gap-4">
      <OptionToggle
        label="Asks for"
        value={field.type}
        options={typeOptions}
        onChange={(type) => updateField(field.id, { type })}
      />
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
      <OptionToggle
        label="Guests must fill it in"
        value={field.required ? "required" : "optional"}
        options={requiredOptions}
        onChange={(value) =>
          updateField(field.id, { required: value === "required" })
        }
      />
      <LayoutSection>
        <SliderField
          label="Width"
          unit="%"
          value={resolved.width ?? layoutDefaults.fieldWidth}
          min={ELEMENT_WIDTH_MIN}
          max={ELEMENT_WIDTH_MAX}
          onValueChange={(width) => updateField(field.id, { width })}
        />
        <SpaceAboveSlider
          value={resolved.spaceAbove}
          onValueChange={(spaceAbove) => updateField(field.id, { spaceAbove })}
        />
      </LayoutSection>
      <RemoveButton
        label="Remove field"
        onClick={() => removeField(field.id)}
      />
    </div>
  );
}
