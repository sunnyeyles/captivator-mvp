import type {
  BackgroundImage,
  GuestFieldType,
  PortalConfig,
  TextElement,
} from "./schema";

/** The style a newly added text element starts with, before the user edits it. */
export const defaultTextStyle: Omit<TextElement, "id" | "text"> = {
  fontSize: 20,
  color: "#ffffff",
  fontWeight: 400,
  textAlign: "center",
};

/** The label and placeholder a guest field shows until the user sets its own. */
export const guestFieldDefaults: Record<
  GuestFieldType,
  { label: string; placeholder: string }
> = {
  name: { label: "Name", placeholder: "Your name" },
  email: { label: "Email", placeholder: "you@example.com" },
  phone: { label: "Phone", placeholder: "Your phone number" },
};

/** The id the Connect button is selected by, since a page has exactly one. */
export const CONNECT_BUTTON_ID = "connect-button";

/** The design a new splash page starts from. */
export const defaultPortalConfig: PortalConfig = {
  texts: [
    {
      id: "welcome-heading",
      text: "Welcome to our Wi-Fi",
      fontSize: 48,
      color: "#ffffff",
      fontWeight: 700,
      textAlign: "center",
    },
    {
      id: "welcome-subheading",
      text: "Connect to get online",
      ...defaultTextStyle,
    },
  ],
  background: {
    type: "color",
    color: "#1c1917",
    image: null,
  },
  branding: {
    logo: null,
  },
  fields: [{ id: "field-1", type: "email", required: true }],
  button: {
    label: "Connect",
    backgroundColor: "#f5f5f4",
    textColor: "#1c1917",
    borderRadius: 8,
    width: 100,
  },
};

/** The settings a newly uploaded background image starts with. */
export const defaultBackgroundImageSettings: Omit<BackgroundImage, "src"> = {
  fit: "cover",
  position: "center",
  overlay: null,
};

/** The overlay applied when the user first turns it on. */
export const defaultOverlay: NonNullable<BackgroundImage["overlay"]> = {
  color: "#000000",
  opacity: 0.4,
};
