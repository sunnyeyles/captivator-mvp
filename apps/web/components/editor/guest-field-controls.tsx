"use client";

import {
  ELEMENT_WIDTH_MAX,
  ELEMENT_WIDTH_MIN,
  GUEST_FIELD_LABEL_MAX,
  GUEST_FIELD_PLACEHOLDER_MAX,
  guestFieldDefaults,
  guestFieldSchema,
  layoutDefaults,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  type GuestField,
  type StyleOverride,
} from "@repo/portal";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";
import { DeviceOverrideNumberField } from "./device-override-number-field";

export function GuestFieldControls({ field }: { field: GuestField }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateField = usePortalEditorStore((state) => state.updateField);
  const overrideField = usePortalEditorStore((state) => state.overrideField);
  const clearFieldOverride = usePortalEditorStore(
    (state) => state.clearFieldOverride,
  );
  const removeField = usePortalEditorStore((state) => state.removeField);
  const labelId = useId();
  const placeholderId = useId();
  const defaults = guestFieldDefaults[field.type];

  const resolved = resolveForDevice(field, deviceMode);
  const deviceOverride = field.overrides?.[deviceMode];
  const widthOverridden = deviceOverride?.width !== undefined;
  const spaceAboveOverridden = deviceOverride?.spaceAbove !== undefined;
  const sharedWidth = field.width ?? layoutDefaults.fieldWidth;
  const sharedSpaceAbove = field.spaceAbove ?? layoutDefaults.spaceAbove;

  // An overridable control edits the active device's override once one exists, and the shared value otherwise
  function updateStyle(
    overridden: boolean,
    changes: StyleOverride<GuestField>,
  ) {
    if (overridden) overrideField(field.id, deviceMode, changes);
    else updateField(field.id, changes);
  }

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
      <DeviceOverrideNumberField
        label="Width (%)"
        property="width"
        device={deviceMode}
        overridden={widthOverridden}
        value={resolved.width ?? sharedWidth}
        min={ELEMENT_WIDTH_MIN}
        max={ELEMENT_WIDTH_MAX}
        schema={guestFieldSchema.shape.width.unwrap()}
        onOverride={() =>
          overrideField(field.id, deviceMode, { width: sharedWidth })
        }
        onClear={() => clearFieldOverride(field.id, deviceMode, "width")}
        onValueChange={(width) => updateStyle(widthOverridden, { width })}
      />
      <DeviceOverrideNumberField
        label="Space above (px)"
        property="space above"
        device={deviceMode}
        overridden={spaceAboveOverridden}
        value={resolved.spaceAbove ?? sharedSpaceAbove}
        min={SPACE_ABOVE_MIN}
        max={SPACE_ABOVE_MAX}
        schema={guestFieldSchema.shape.spaceAbove.unwrap()}
        onOverride={() =>
          overrideField(field.id, deviceMode, { spaceAbove: sharedSpaceAbove })
        }
        onClear={() => clearFieldOverride(field.id, deviceMode, "spaceAbove")}
        onValueChange={(spaceAbove) =>
          updateStyle(spaceAboveOverridden, { spaceAbove })
        }
      />
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
