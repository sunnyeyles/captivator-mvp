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
  type StyleOverride,
} from "@repo/portal";
import { usePortalEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { DeviceOverrideNumberField } from "./device-override-number-field";
import { ValidatedField } from "./validated-field";

export function ButtonControls({ button }: { button: ConnectButton }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateButton = usePortalEditorStore((state) => state.updateButton);
  const overrideButton = usePortalEditorStore((state) => state.overrideButton);
  const clearButtonOverride = usePortalEditorStore(
    (state) => state.clearButtonOverride,
  );

  const resolved = resolveForDevice(button, deviceMode);
  const deviceOverride = button.overrides?.[deviceMode];
  const widthOverridden = deviceOverride?.width !== undefined;
  const spaceAboveOverridden = deviceOverride?.spaceAbove !== undefined;

  // An overridable control edits the active device's override once one exists, and the shared value otherwise
  function updateStyle(
    overridden: boolean,
    changes: StyleOverride<ConnectButton>,
  ) {
    if (overridden) overrideButton(deviceMode, changes);
    else updateButton(changes);
  }

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
      <DeviceOverrideNumberField
        label="Width (%)"
        property="width"
        device={deviceMode}
        overridden={widthOverridden}
        value={resolved.width}
        min={ELEMENT_WIDTH_MIN}
        max={ELEMENT_WIDTH_MAX}
        schema={buttonSchema.shape.width}
        onOverride={() => overrideButton(deviceMode, { width: button.width })}
        onClear={() => clearButtonOverride(deviceMode, "width")}
        onValueChange={(width) => updateStyle(widthOverridden, { width })}
      />
      <DeviceOverrideNumberField
        label="Space above (px)"
        property="space above"
        device={deviceMode}
        overridden={spaceAboveOverridden}
        value={resolved.spaceAbove ?? layoutDefaults.spaceAbove}
        min={SPACE_ABOVE_MIN}
        max={SPACE_ABOVE_MAX}
        schema={buttonSchema.shape.spaceAbove.unwrap()}
        onOverride={() =>
          overrideButton(deviceMode, {
            spaceAbove: button.spaceAbove ?? layoutDefaults.spaceAbove,
          })
        }
        onClear={() => clearButtonOverride(deviceMode, "spaceAbove")}
        onValueChange={(spaceAbove) =>
          updateStyle(spaceAboveOverridden, { spaceAbove })
        }
      />
    </div>
  );
}
