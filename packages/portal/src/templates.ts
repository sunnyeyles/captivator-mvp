import { centeredBackgroundPosition, defaultPortalConfig } from "./defaults";
import type { PortalConfig } from "./schema";
import { eventBackgroundSrc, placeholderLogoSrc } from "./template-assets";

export const templateIds = ["minimal", "event", "corporate"] as const;

export type TemplateId = (typeof templateIds)[number];

export interface PortalTemplate {
  id: TemplateId;
  name: string;
  description: string;
  config: PortalConfig;
}

const minimal: PortalTemplate = {
  id: "minimal",
  name: "Minimal",
  description: "Centred logo, heading, fields and Connect button",
  config: {
    ...defaultPortalConfig,
    branding: { logo: { src: placeholderLogoSrc("#ffffff"), alt: "Logo" } },
  },
};

const event: PortalTemplate = {
  id: "event",
  name: "Event",
  description: "Bold background image with branding laid over it",
  config: {
    texts: [
      {
        id: "event-title",
        text: "Summer Launch Night",
        fontSize: 56,
        color: "#ffffff",
        fontWeight: 700,
        textAlign: "center",
        // Too wide for a phone at the desktop size, so the preset ships its own mobile size
        overrides: { mobile: { fontSize: 40 } },
      },
      {
        id: "event-tagline",
        text: "Join the Wi-Fi and share the moment",
        fontSize: 22,
        color: "#fdf2f8",
        fontWeight: 500,
        textAlign: "center",
      },
    ],
    background: {
      type: "image",
      color: "#1e1b4b",
      image: {
        src: eventBackgroundSrc,
        fit: "cover",
        position: centeredBackgroundPosition,
        recommended: null,
        overlay: { color: "#000000", opacity: 0.3 },
      },
    },
    branding: { logo: { src: placeholderLogoSrc("#ffffff"), alt: "Logo" } },
    fields: [
      { id: "field-1", type: "name", required: true },
      { id: "field-2", type: "email", required: true },
    ],
    button: {
      label: "Get online",
      backgroundColor: "#db2777",
      textColor: "#ffffff",
      borderRadius: 32,
      width: 100,
    },
  },
};

const corporate: PortalTemplate = {
  id: "corporate",
  name: "Corporate",
  description: "Light, structured and professional",
  config: {
    texts: [
      {
        id: "corporate-heading",
        text: "Welcome, guest",
        fontSize: 40,
        color: "#0f172a",
        fontWeight: 700,
        textAlign: "center",
      },
      {
        id: "corporate-intro",
        text: "Enter your details to use our complimentary Wi-Fi.",
        fontSize: 18,
        color: "#334155",
        fontWeight: 400,
        textAlign: "center",
      },
      {
        id: "corporate-terms",
        text: "By connecting you agree to our acceptable use policy.",
        fontSize: 14,
        color: "#64748b",
        fontWeight: 400,
        textAlign: "center",
      },
    ],
    background: { type: "color", color: "#f8fafc", image: null },
    branding: { logo: { src: placeholderLogoSrc("#1e3a8a"), alt: "Logo" } },
    fields: [
      { id: "field-1", type: "name", label: "Full name", required: true },
      { id: "field-2", type: "email", label: "Work email", required: true },
    ],
    button: {
      label: "Connect",
      backgroundColor: "#1e3a8a",
      textColor: "#ffffff",
      borderRadius: 4,
      width: 100,
    },
  },
};

/** Every template by id, each a preset of the one portal config drawn by the shared renderer. */
export const templates: Record<TemplateId, PortalTemplate> = {
  minimal,
  event,
  corporate,
};
