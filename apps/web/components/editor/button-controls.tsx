"use client";

import {
  BUTTON_LABEL_MAX,
  BUTTON_RADIUS_MAX,
  BUTTON_RADIUS_MIN,
  BUTTON_WIDTH_MAX,
  BUTTON_WIDTH_MIN,
  buttonSchema,
  type ConnectButton,
} from "@repo/portal";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { ValidatedField } from "./validated-field";

export function ButtonControls({ button }: { button: ConnectButton }) {
  const updateButton = usePortalEditorStore((state) => state.updateButton);

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
      <div className="grid grid-cols-2 gap-3">
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
          label="Width (%)"
          type="number"
          inputMode="numeric"
          min={BUTTON_WIDTH_MIN}
          max={BUTTON_WIDTH_MAX}
          step={1}
          value={button.width}
          schema={buttonSchema.shape.width}
          onValueChange={(width) => updateButton({ width })}
        />
      </div>
    </div>
  );
}
