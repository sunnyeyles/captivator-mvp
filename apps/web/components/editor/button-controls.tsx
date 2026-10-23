"use client";

import {
  BUTTON_LABEL_MAX,
  BUTTON_RADIUS_MAX,
  BUTTON_RADIUS_MIN,
  buttonSchema,
  ELEMENT_WIDTH_MAX,
  ELEMENT_WIDTH_MIN,
  layoutDefaults,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  type ConnectButton,
} from "@repo/portal";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { ValidatedField } from "./validated-field";

export function ButtonControls({ button }: { button: ConnectButton }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateButton = usePortalEditorStore((state) => state.updateButton);

  const resolved = resolveForDevice(button, deviceMode);

  return (
    <div className="grid gap-4">
      <ValidatedField
        label="Label"
        value={button.label}
        schema={buttonSchema.shape.label}
        maxLength={BUTTON_LABEL_MAX}
        autoComplete="off"
        onValueChange={(label) => updateButton({ label })}
      />
      <ColorField
        label="Background colour"
        color={button.backgroundColor}
        onChange={(backgroundColor) => updateButton({ backgroundColor })}
      />
      <ColorField
        label="Text colour"
        color={button.textColor}
        onChange={(textColor) => updateButton({ textColor })}
      />
      <ValidatedField
        label="Radius (px)"
        type="number"
        inputMode="numeric"
        min={BUTTON_RADIUS_MIN}
        max={BUTTON_RADIUS_MAX}
        step={1}
        value={button.borderRadius}
        schema={buttonSchema.shape.borderRadius}
        onValueChange={(borderRadius) => updateButton({ borderRadius })}
      />
      <ValidatedField
        key={`width-${deviceMode}`}
        label="Width (%)"
        type="number"
        inputMode="numeric"
        min={ELEMENT_WIDTH_MIN}
        max={ELEMENT_WIDTH_MAX}
        step={1}
        value={resolved.width}
        schema={buttonSchema.shape.width}
        onValueChange={(width) => updateButton({ width })}
      />
      <ValidatedField
        key={`space-above-${deviceMode}`}
        label="Space above (px)"
        type="number"
        inputMode="numeric"
        min={SPACE_ABOVE_MIN}
        max={SPACE_ABOVE_MAX}
        step={1}
        value={resolved.spaceAbove ?? layoutDefaults.spaceAbove}
        schema={buttonSchema.shape.spaceAbove.unwrap()}
        onValueChange={(spaceAbove) => updateButton({ spaceAbove })}
      />
    </div>
  );
}
