"use client";

import { usePortalEditorStore } from "@/lib/editor-store";
import { ImageUploadField } from "./image-upload-field";

export function LogoControls() {
  const logo = usePortalEditorStore((state) => state.config.branding.logo);
  const updateBranding = usePortalEditorStore((state) => state.updateBranding);

  return (
    <ImageUploadField
      label="Logo"
      src={logo?.src ?? null}
      onUpload={(src) => updateBranding({ logo: { src, alt: "Logo" } })}
      onRemove={() => updateBranding({ logo: null })}
    />
  );
}
