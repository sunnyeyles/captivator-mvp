"use client";

import {
  layoutDefaults,
  LOGO_MAX_HEIGHT_MAX,
  LOGO_MAX_HEIGHT_MIN,
  resolveForDevice,
  type Logo,
} from "@repo/portal";
import { usePortalEditorStore } from "@/lib/editor-store";
import { LayoutSection } from "./layout-section";
import { SliderField, SpaceAboveSlider } from "./slider-field";
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
  const updateLogo = usePortalEditorStore((state) => state.updateLogo);

  const resolved = resolveForDevice(logo, deviceMode);

  return (
    <div className="grid gap-4">
      <SliderField
        label="Size"
        unit="px"
        value={resolved.maxHeight ?? layoutDefaults.logoMaxHeight}
        min={LOGO_MAX_HEIGHT_MIN}
        max={LOGO_MAX_HEIGHT_MAX}
        onValueChange={(maxHeight) => updateLogo({ maxHeight })}
      />
      <LayoutSection>
        <SpaceAboveSlider
          value={resolved.spaceAbove}
          onValueChange={(spaceAbove) => updateLogo({ spaceAbove })}
        />
      </LayoutSection>
    </div>
  );
}
