"use client";

import {
  layoutDefaults,
  LOGO_MAX_HEIGHT_MAX,
  LOGO_MAX_HEIGHT_MIN,
  logoSchema,
  resolveForDevice,
  SPACE_ABOVE_MAX,
  SPACE_ABOVE_MIN,
  type Logo,
  type StyleOverride,
} from "@repo/portal";
import { usePortalEditorStore } from "@/lib/editor-store";
import { DeviceOverrideNumberField } from "./device-override-number-field";
import { ImageUploadField } from "./image-upload-field";

export function LogoControls() {
  const logo = usePortalEditorStore((state) => state.config.branding.logo);
  const updateBranding = usePortalEditorStore((state) => state.updateBranding);

  return (
    <ImageUploadField
      label="Logo"
      src={logo?.src ?? null}
      // A replaced logo keeps its size, spacing and overrides
      onUpload={(file) =>
        updateBranding({
          logo: {
            ...logo,
            // The store revokes this URL once the config stops referencing it
            src: URL.createObjectURL(file),
            alt: logo?.alt ?? "Logo",
          },
        })
      }
      onRemove={() => updateBranding({ logo: null })}
    />
  );
}

export function LogoLayoutControls({ logo }: { logo: Logo }) {
  const deviceMode = usePortalEditorStore((state) => state.deviceMode);
  const updateBranding = usePortalEditorStore((state) => state.updateBranding);
  const overrideLogo = usePortalEditorStore((state) => state.overrideLogo);
  const clearLogoOverride = usePortalEditorStore(
    (state) => state.clearLogoOverride,
  );

  const resolved = resolveForDevice(logo, deviceMode);
  const deviceOverride = logo.overrides?.[deviceMode];
  const maxHeightOverridden = deviceOverride?.maxHeight !== undefined;
  const spaceAboveOverridden = deviceOverride?.spaceAbove !== undefined;
  const sharedMaxHeight = logo.maxHeight ?? layoutDefaults.logoMaxHeight;
  const sharedSpaceAbove = logo.spaceAbove ?? layoutDefaults.spaceAbove;

  // An overridable control edits the active device's override once one exists, and the shared value otherwise
  function updateStyle(overridden: boolean, changes: StyleOverride<Logo>) {
    if (overridden) overrideLogo(deviceMode, changes);
    else updateBranding({ logo: { ...logo, ...changes } });
  }

  return (
    <div className="grid gap-4">
      <DeviceOverrideNumberField
        label="Max height (px)"
        property="max height"
        device={deviceMode}
        overridden={maxHeightOverridden}
        value={resolved.maxHeight ?? sharedMaxHeight}
        min={LOGO_MAX_HEIGHT_MIN}
        max={LOGO_MAX_HEIGHT_MAX}
        schema={logoSchema.shape.maxHeight.unwrap()}
        onOverride={() =>
          overrideLogo(deviceMode, { maxHeight: sharedMaxHeight })
        }
        onClear={() => clearLogoOverride(deviceMode, "maxHeight")}
        onValueChange={(maxHeight) =>
          updateStyle(maxHeightOverridden, { maxHeight })
        }
      />
      <DeviceOverrideNumberField
        label="Space above (px)"
        property="space above"
        device={deviceMode}
        overridden={spaceAboveOverridden}
        value={resolved.spaceAbove ?? sharedSpaceAbove}
        min={SPACE_ABOVE_MIN}
        max={SPACE_ABOVE_MAX}
        schema={logoSchema.shape.spaceAbove.unwrap()}
        onOverride={() =>
          overrideLogo(deviceMode, { spaceAbove: sharedSpaceAbove })
        }
        onClear={() => clearLogoOverride(deviceMode, "spaceAbove")}
        onValueChange={(spaceAbove) =>
          updateStyle(spaceAboveOverridden, { spaceAbove })
        }
      />
    </div>
  );
}
