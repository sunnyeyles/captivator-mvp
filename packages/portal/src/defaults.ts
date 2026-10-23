import type {
  BackgroundImage,
  BackgroundPosition,
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

/** The spacing and sizes an element uses until the user sets its own. */
export const layoutDefaults = {
  spaceAbove: 0,
  fieldWidth: 100,
  logoMaxHeight: 96,
} as const;

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

/** The background image position that shows the middle of the image. */
export const centeredBackgroundPosition: BackgroundPosition = { x: 50, y: 50 };

/** The settings a newly placed background image starts with. */
export const defaultBackgroundImageSettings: Omit<
  BackgroundImage,
  "src" | "overrides"
> = {
  fit: "cover",
  position: centeredBackgroundPosition,
  recommended: null,
  overlay: null,
};

/** The overlay applied when the user first turns it on. */
export const defaultOverlay: NonNullable<BackgroundImage["overlay"]> = {
  color: "#000000",
  opacity: 0.4,
};
