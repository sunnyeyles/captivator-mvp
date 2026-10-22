import { useId, type CSSProperties } from "react";
import { CONNECT_BUTTON_ID, guestFieldDefaults } from "../defaults";
import { resolveForDevice } from "../overrides";
import type {
  Device,
  GuestField,
  GuestFieldType,
  PortalConfig,
  RenderMode,
} from "../schema";
import { guestLabelStyle } from "./contrast";
import {
  clearSelectionProps,
  selectableProps,
  type Selection,
} from "./selection";

export interface SplashPageProps {
  config: PortalConfig;
  device: Device;
  mode: RenderMode;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
}

/** The element id the logo uses for canvas selection. */
export const LOGO_ELEMENT_ID = "logo";

const layoutByDevice: Record<
  Device,
  { page: string; content: string; form: string; logo: string }
> = {
  desktop: {
    page: "px-16",
    content: "max-w-3xl gap-4",
    form: "max-w-sm",
    logo: "max-h-28",
  },
  mobile: {
    page: "px-6",
    content: "max-w-full gap-3",
    form: "max-w-full",
    logo: "max-h-20",
  },
};

const inputAttributesByType: Record<
  GuestFieldType,
  { type: string; autoComplete: string }
> = {
  name: { type: "text", autoComplete: "name" },
  email: { type: "email", autoComplete: "email" },
  phone: { type: "tel", autoComplete: "tel" },
};

function GuestFieldInput({
  field,
  inputId,
  labelStyle,
  selection,
}: {
  field: GuestField;
  inputId: string;
  labelStyle: CSSProperties;
  selection: Selection;
}) {
  const defaults = guestFieldDefaults[field.type];
  const editing = selection.mode === "edit";

  return (
    <div className="grid gap-1.5" {...selectableProps(field.id, selection)}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium"
        style={labelStyle}
      >
        {field.label || defaults.label}
        {field.required ? <span aria-hidden> *</span> : null}
      </label>
      <input
        id={inputId}
        name={field.type}
        {...inputAttributesByType[field.type]}
        placeholder={field.placeholder ?? defaults.placeholder}
        required={field.required}
        // In edit mode a click on the input selects its field instead of focusing it
        readOnly={editing}
        tabIndex={editing ? -1 : undefined}
        className={`h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-500 ${editing ? "pointer-events-none" : ""}`}
      />
    </div>
  );
}

function backgroundStyle(background: PortalConfig["background"]) {
  const style: CSSProperties = { backgroundColor: background.color };
  if (background.type !== "image" || !background.image) return style;
  return {
    ...style,
    backgroundImage: `url(${JSON.stringify(background.image.src)})`,
    backgroundSize: background.image.fit,
    backgroundPosition: background.image.position,
    backgroundRepeat: "no-repeat",
  };
}

/** Renders a splash page from its config for one device, taking selection state and callbacks as props in edit mode. */
export function SplashPage({
  config,
  device,
  mode,
  selectedElementId,
  onSelectElement,
}: SplashPageProps) {
  const layout = layoutByDevice[device];
  const selection = { mode, selectedElementId, onSelectElement };
  const inputIdPrefix = useId();
  const { background, branding, button } = config;
  const overlay =
    background.type === "image" ? background.image?.overlay : null;
  const labelStyle = guestLabelStyle(background);

  return (
    // Customer colours are inline on this root so they can never leak into the host page's theme
    <div
      data-device={device}
      data-mode={mode}
      className={`relative flex size-full flex-col items-center justify-center ${layout.page}`}
      style={backgroundStyle(background)}
      {...clearSelectionProps(selection)}
    >
      {overlay ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: overlay.color, opacity: overlay.opacity }}
        />
      ) : null}
      <div className={`relative flex w-full flex-col ${layout.content}`}>
        {branding.logo ? (
          <img
            src={branding.logo.src}
            alt={branding.logo.alt}
            className={`w-auto max-w-full self-center object-contain ${layout.logo}`}
            {...selectableProps(LOGO_ELEMENT_ID, selection)}
          />
        ) : null}
        {config.texts
          .map((text) => resolveForDevice(text, device))
          .map((text) => (
            <p
              key={text.id}
              // Keeps a line's height when the text is emptied so it stays clickable in the canvas
              className="min-h-lh leading-tight text-balance break-words whitespace-pre-line"
              style={{
                color: text.color,
                fontSize: text.fontSize,
                fontWeight: text.fontWeight,
                textAlign: text.textAlign,
              }}
              {...selectableProps(text.id, selection)}
            >
              {text.text}
            </p>
          ))}
        {/* No form element, so neither the fields nor the button can ever submit or connect */}
        <div
          className={`flex w-full flex-col gap-3 self-center pt-2 ${layout.form}`}
        >
          {config.fields.map((field) => (
            <GuestFieldInput
              key={field.id}
              field={field}
              inputId={`${inputIdPrefix}-${field.id}`}
              labelStyle={labelStyle}
              selection={selection}
            />
          ))}
          <button
            type="button"
            className="h-11 self-center px-4 text-base font-semibold"
            style={{
              backgroundColor: button.backgroundColor,
              color: button.textColor,
              borderRadius: button.borderRadius,
              width: `${button.width}%`,
            }}
            {...selectableProps(CONNECT_BUTTON_ID, selection)}
          >
            {button.label}
          </button>
        </div>
      </div>
    </div>
  );
}
