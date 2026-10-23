"use client";

import { BRAND_COLORS_MAX } from "@repo/portal";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "@repo/ui/button";
import { prepareBackgroundImage } from "@/lib/background-analysis";
import type { DesignStart } from "@/lib/design-agent";
import { imageColors } from "@/lib/dominant-colors";
import { assetFileError, assetImageTypes, SVG_TYPE } from "@/lib/images";
import { OptionToggle } from "./option-toggle";
import { PromptCard } from "./prompt-card";

type AssetRole = "background" | "logo";

interface Asset {
  file: File;
  preview: string;
  role: AssetRole;
}

const MAX_ASSETS = 2;

const SVG_BACKGROUND_ERROR =
  "An SVG can only be the logo. Add a PNG, JPEG or WebP for the background.";

function otherRole(role: AssetRole): AssetRole {
  return role === "background" ? "logo" : "background";
}

function canBe(asset: Pick<Asset, "file">, role: AssetRole) {
  return role === "logo" || asset.file.type !== SVG_TYPE;
}

// SVGs default to the logo and the first photo to the background, and each role holds one image
function roleFor(file: File, taken: AssetRole | undefined): AssetRole | null {
  const preferred: AssetRole = file.type === SVG_TYPE ? "logo" : "background";
  const role = preferred === taken ? otherRole(preferred) : preferred;
  return canBe({ file }, role) ? role : null;
}

export function UploadAssetCard({
  disabled,
  onStart,
}: {
  disabled: boolean;
  onStart: (start: DesignStart) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => {
    previews.current = assets.map((asset) => asset.preview);
  }, [assets]);

  // Previews never reach the store, so they're freed here when the card goes away
  useEffect(
    () => () => previews.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setOpen(true);
    let next = assets;
    let message: string | null = null;
    for (const file of files) {
      const fileError = assetFileError(file);
      if (fileError) {
        message = fileError;
        continue;
      }
      if (next.length >= MAX_ASSETS) {
        message = "Add up to two images: a background and a logo.";
        break;
      }
      const role = roleFor(file, next[0]?.role);
      if (!role) {
        message = SVG_BACKGROUND_ERROR;
        continue;
      }
      next = [...next, { file, preview: URL.createObjectURL(file), role }];
    }
    setAssets(next);
    setError(message);
  }

  function remove(index: number) {
    const asset = assets[index];
    if (asset) URL.revokeObjectURL(asset.preview);
    setAssets(assets.filter((_, current) => current !== index));
    setError(null);
  }

  // A second image swaps roles with the first, so neither role ever holds two
  function changeRole(index: number, role: AssetRole) {
    setAssets(
      assets.map((asset, current) =>
        current === index
          ? { ...asset, role }
          : { ...asset, role: otherRole(role) },
      ),
    );
  }

  function roleDisabled(index: number, role: AssetRole) {
    const asset = assets[index]!;
    const other = assets.find((_, current) => current !== index);
    return (
      !canBe(asset, role) ||
      (other !== undefined && !canBe(other, otherRole(role)))
    );
  }

  async function start() {
    if (assets.length === 0 || disabled || preparing) return;
    setPreparing(true);
    const background = assets.find((asset) => asset.role === "background");
    const logo = assets.find((asset) => asset.role === "logo");
    const prepared = background
      ? await prepareBackgroundImage(background.file)
      : undefined;
    // The store revokes this URL once the config stops referencing it, as for a logo uploaded in the sidebar
    const logoSrc = logo ? URL.createObjectURL(logo.file) : undefined;
    const colors = [
      ...new Set([
        ...(logoSrc ? await imageColors(logoSrc) : []),
        ...(prepared ? await imageColors(prepared.src) : []),
      ]),
    ].slice(0, BRAND_COLORS_MAX);
    setPreparing(false);
    const sent = onStart({
      text: "Design a page around my uploaded images",
      brand: { colors, hasLogo: logoSrc !== undefined },
      assets: { logo: logoSrc, background: prepared },
    });
    // A reply that started in the meantime took the turn, so these URLs never reached the store
    if (!sent) {
      if (logoSrc) URL.revokeObjectURL(logoSrc);
      if (prepared) URL.revokeObjectURL(prepared.src);
    }
  }

  function dragOver(event: DragEvent) {
    if (disabled) return;
    event.preventDefault();
    setDragging(true);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(event.dataTransfer.files);
  }

  return (
    <PromptCard
      icon={Upload}
      title="Upload assets"
      description="Drop in your logo or a photo and I'll theme around them."
      disabled={disabled}
      expanded={open}
      highlighted={dragging}
      onClick={() => setOpen(!open)}
      onDragOver={dragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      {open ? (
        <div className="grid gap-3">
          {assets.map((asset, index) => (
            <div
              key={asset.preview}
              className="grid grid-cols-[4rem_1fr_auto] items-end gap-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image cannot load browser object URLs */}
              <img
                src={asset.preview}
                alt={asset.file.name}
                className="size-16 rounded-md border bg-muted object-contain"
              />
              <OptionToggle
                label={`Use ${asset.file.name} as`}
                value={asset.role}
                options={(["background", "logo"] as const).map((role) => ({
                  value: role,
                  label: role === "background" ? "Background" : "Logo",
                  disabled: roleDisabled(index, role),
                }))}
                onChange={(role) => changeRole(index, role)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${asset.file.name}`}
                onClick={() => remove(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {assets.length < MAX_ASSETS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus />
                Choose images
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={disabled || preparing || assets.length === 0}
              onClick={() => void start()}
            >
              Design with these
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={assetImageTypes.join(",")}
            aria-label="Choose images to upload"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              addFiles(event.target.files);
              // Clears the input so choosing the same file again still fires a change
              event.target.value = "";
            }}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, WebP or SVG, up to 5 MB. Drag files onto this card.
            </p>
          )}
        </div>
      ) : null}
    </PromptCard>
  );
}
