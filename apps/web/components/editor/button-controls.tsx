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
import { LayoutSection } from "./layout-section";
import { SliderField } from "./slider-field";
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
      <LayoutSection>
        <SliderField
          label="Width"
          unit="%"
          value={resolved.width}
          min={ELEMENT_WIDTH_MIN}
          max={ELEMENT_WIDTH_MAX}
          onValueChange={(width) => updateButton({ width })}
        />
        <SliderField
          label="Corner radius"
          unit="px"
          value={button.borderRadius}
          min={BUTTON_RADIUS_MIN}
          max={BUTTON_RADIUS_MAX}
          onValueChange={(borderRadius) => updateButton({ borderRadius })}
        />
        <SliderField
          label="Space above"
          unit="px"
          value={resolved.spaceAbove ?? layoutDefaults.spaceAbove}
          min={SPACE_ABOVE_MIN}
          max={SPACE_ABOVE_MAX}
          onValueChange={(spaceAbove) => updateButton({ spaceAbove })}
        />
      </LayoutSection>
    </div>
  );
}
