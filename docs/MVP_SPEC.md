# Wi-Fi Splash Page Builder — Product & Technical Specification

**Architecture:** Turborepo monorepo  
**Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui  
**State management:** Zustand  
**Status:** MVP specification with proposed future infrastructure

## 1. Product Overview

A visual Wi-Fi splash page builder that enables customers to create and customise branded captive portal experiences.

Users can start from professionally designed templates, upload branding assets, customise text and colours, configure guest information fields, and edit their splash page visually.

The editor supports three design modes: **Desktop**, **Tablet** and **Mobile**. Users can switch between these modes while creating their splash page, view the corresponding layout, and make changes directly in any mode.

The product should provide an intuitive WYSIWYG experience for non-technical customers.

### Objectives

- Provide a visual splash page editor with desktop, tablet and mobile editing modes.
- Include reusable, customisable templates.
- Support customer logos, images, backgrounds, colours and text.
- Allow configuration of up to two guest input fields.
- Provide customisable Connect button styling.
- Reflect changes instantly in the active design canvas.
- Support responsive designs with consistent branding across device types.
- Use a reusable, schema-driven rendering architecture.
- Establish a foundation for future automation, publishing and Wi-Fi infrastructure integration.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React |
| Components | shadcn/ui |
| Styling | Tailwind CSS |
| State management | Zustand |
| Validation | Zod |
| Icons | Lucide React |
| Package management | pnpm |
| Deployment | Vercel or equivalent |

The core editor operates client-side and does not require a database or external API.

## 3. Monorepo Architecture

```text
splash-page-builder/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── editor/
│       │   └── preview/
│       └── package.json
│
├── packages/
│   ├── ui/
│   │   └── src/components/
│   ├── portal/
│   │   └── src/
│   │       ├── schema.ts
│   │       ├── defaults.ts
│   │       ├── templates.ts
│   │       └── renderer/
│   └── config/
│       └── typescript/
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**apps/web:** Next.js application, editor shell, editing controls and design canvas.

**packages/ui:** Shared shadcn/ui components, theme tokens and interface primitives.

**packages/portal:** Portal schemas, templates, defaults and responsive rendering components.

**packages/config:** Shared tooling configuration.

## 4. Design System

### Visual Direction

The editor should use a consistent, modern visual design system with:

- Clear typography and visual hierarchy
- Prominent primary actions
- Neutral surfaces and well-defined controls
- Consistent spacing and alignment
- Accessible contrast and focus states
- Responsive layouts

### Theme Separation

**Application theme:** The consistent design system used for the editor shell.

**Customer portal theme:** Customer-selected colours, imagery and typography used for their splash page.

Customer branding must not alter the editor interface.

### UI Components

Use shadcn/ui primitives where appropriate, including Button, Input, Select, Tabs, Slider, Popover, Dialog, Tooltip and Card.

## 5. Editor Layout

The editor contains three main areas.

### Application Toolbar

- Application identity
- Desktop/Tablet/Mobile mode switcher
- Undo and redo, a Preview toggle, Save and Publish
- A menu holding Reset to template, away from undo so it is not hit by mistake

### Properties Sidebar

The sidebar shows one thing at a time, so the customer always knows where an edit goes.

**Nothing selected:** the Page panel holds Change design, one dialog for switching template or generating designs from the customer's website, since both replace the current design. Below it are the page's elements (logo, texts, guest fields and Connect button, with Add text and Add field) and the background. Choosing an element in the list selects it.

**An element selected**, from the list or the canvas: only that element's controls, with a way back to the page.

### Interactive Design Canvas

The canvas displays the active device layout and responds immediately to configuration changes.

Users can select elements in the canvas and modify them using the properties sidebar.

The canvas must support desktop, tablet and mobile editing modes.

## 6. Desktop, Tablet and Mobile Editing

### 6.1 Device Mode Switcher

Provide a clearly visible segmented control in the editor toolbar:

**Desktop | Tablet | Mobile**

Switching modes changes the canvas dimensions and renders the corresponding responsive layout.

Users can edit their splash page in any mode.

### 6.2 Desktop Editing Mode

Desktop mode displays a wide splash page canvas.

Users can:

- Upload and modify images.
- Edit text and colours.
- Configure backgrounds.
- Add or remove guest input fields.
- Customise the Connect button.
- Select elements directly in the desktop canvas.
- Review the desktop layout while making changes.

The canvas should scale to fit the available editor workspace without altering the underlying design.

### 6.3 Mobile Editing Mode

Mobile mode displays a phone-sized splash page canvas.

Users can:

- Perform all supported editing operations.
- Select elements directly in the mobile canvas.
- Adjust text and branding.
- Configure fields and button styles.
- Inspect spacing, alignment and content wrapping.
- Review the appearance of the captive portal on a mobile device.

The mobile canvas should accurately represent a typical phone viewport.

### 6.4 Tablet Editing Mode

Tablet mode displays a portrait tablet-sized splash page canvas (820 × 1180).

Users can perform all supported editing operations, select elements directly in the tablet canvas and review the layout between the phone and desktop sizes.

### 6.5 Shared Configuration

Desktop, tablet and mobile modes operate on the same underlying portal configuration.

Changes to shared properties, including text content, colours, images and field selection, are reflected in every mode.

Responsive layout rules determine how the configuration appears at each viewport size.

### 6.6 Device-Specific Overrides

The configuration architecture allows optional device-specific styling. Each element can override these properties for desktop, tablet or mobile:

| Element | Overridable properties |
| --- | --- |
| Text | Font size, text alignment, space above |
| Guest field | Width (% of the form column), space above |
| Connect button | Width (% of the form column), space above |
| Logo | Maximum height, space above |
| Background image | Position |

Space above adds to the device layout's own spacing between elements. Each override is validated against the same range as its shared value.

Layout arrangement remains a possible future override.

The editor does not expose overrides for elements, because a per-field override control made the sidebar hard to read. Overrides come from templates and from brand fitting (a long business name gets a smaller heading on mobile). Every element edit sets the shared value and clears that property's overrides on every device, so an edit always shows on the canvas. Switching template replaces any existing overrides with the template's.

Background image position is the one property that is per device from the start, because each device gets its own automatic position (see section 9). Dragging the image in reposition mode always acts on the active device, so that drag is the explicit choice to override. The sidebar marks the device as adjusted, and **Reset to automatic** clears the override back to the automatic position.

When no override exists, the shared configuration is used.

### 6.7 Editing Versus Preview

**Editing mode:** Users can select elements and modify their properties while viewing the selected device layout.

**Preview mode:** Users see the resulting splash page without editor selection indicators or editing controls inside the canvas.

Both modes should support desktop, tablet and mobile viewports.

## 7. Template System

Templates are included in the MVP.

### Requirements

- Provide multiple predefined designs.
- Display templates in a selectable gallery.
- Allow users to switch templates.
- Load template settings into Zustand.
- Support editing after selection.
- Render templates through the shared portal renderer.
- Ensure templates support desktop, tablet and mobile layouts.

### Initial Templates

**Minimal:** Centred logo, heading, fields and Connect button.

**Event:** Prominent background imagery with overlaid branding and content.

**Corporate:** Structured layout suited to professional events and venues.

Templates should be configuration presets rather than separate independently implemented pages.

## 8. Zustand State Management

Zustand manages the active splash page configuration and editor interface state.

### Responsibilities

- Selected template
- Logo and image references
- Background configuration
- Text elements
- Guest input fields
- Connect button configuration
- Active device mode
- Selected canvas element
- Editing or preview mode
- Optional device-specific overrides

### Example Store Interface

```ts
type DeviceMode = "desktop" | "tablet" | "mobile";
type CanvasMode = "edit" | "preview";

interface PortalEditorStore {
  config: PortalConfig;
  deviceMode: DeviceMode;
  canvasMode: CanvasMode;
  selectedElementId: string | null;

  setTemplate: (id: string) => void;
  setDeviceMode: (mode: DeviceMode) => void;
  setCanvasMode: (mode: CanvasMode) => void;
  selectElement: (id: string | null) => void;

  updateBranding: (
    changes: Partial<PortalConfig["branding"]>
  ) => void;

  updateBackground: (
    changes: Partial<PortalConfig["background"]>
  ) => void;

  updateText: (
    id: string,
    changes: Partial<TextElement>
  ) => void;

  setFields: (fields: GuestField[]) => void;

  updateButton: (
    changes: Partial<PortalConfig["button"]>
  ) => void;

  reset: () => void;
}
```

### State Flow

```text
Editor Controls / Canvas Interaction
                |
                v
          Zustand Store
                |
                v
       Portal Configuration
                |
                v
       Responsive Renderer
                |
         +-------+-------+
         |       |       |
         v       v       v
    Desktop   Tablet   Mobile
     View      View     View
```

Switching device modes must not discard configuration changes.

## 9. Image and Background Controls

Users can upload, replace and remove logos and images.

Supported formats include PNG, JPEG and WebP.

Background options:

- Solid colour
- Uploaded image
- Image fitting (fill or fit) and per-device positioning
- Optional overlay

The image is shown unmodified with CSS `object-fit` and a per-device `object-position`, stored as `x`/`y` percentages in the portal config. No cropped or re-encoded copy is made, and the published page needs no JavaScript to position it.

When a background image is uploaded, the editor analyses it in the browser with Smartcrop.js, loaded on first use, and places it with a recommended position for desktop, tablet and mobile in one undo step. A short "finding the best crop" state shows meanwhile. If analysis fails, the image can't be decoded or analysis takes over 2 seconds, the image is placed centred with a quiet note. A newer upload always wins over a late result. Templates' images are never analysed.

The recommendation only applies when the image fills the page. With fit, the whole image shows, so it stays centred. For each device the position resolves to the user's adjustment for that device, then the recommendation, then the shared position. The user can drag the image, or nudge it with the arrow keys, in **Reposition** mode, which adjusts only the active device (see section 6.6).

Images may be represented with browser object URLs during local editing.

Object URLs should be cleaned up when no longer required.

## 10. Text Editing

Users can:

- Add text.
- Edit text content.
- Adjust text colour.
- Adjust font size.
- Remove text elements.

Additional controls may include alignment and font weight.

Text elements should be represented as structured configuration objects.

```json
{
  "id": "welcome-heading",
  "text": "Welcome to our Wi-Fi",
  "fontSize": 32,
  "color": "#FFFFFF",
  "fontWeight": 700,
  "textAlign": "center"
}
```

Optional responsive overrides can adjust supported styles without duplicating content.

## 11. Guest Input Fields

Users can configure up to two fields from:

- Name
- Email
- Phone

Requirements:

- Zero, one or two active fields
- Selection and replacement of field types
- Removal of fields
- Immediate updates in every device mode
- Maximum of two active fields

Optional settings include labels, placeholders, field order and required status.

Actual guest data submission is separate from the visual editor.

## 12. Connect Button

Required controls:

- Background colour
- Text colour

Optional controls:

- Button label
- Border radius
- Width
- Size

The button should respond to the current device layout and update immediately when edited.

Preview interaction must not initiate a real network connection.

## 13. Responsive Portal Renderer

The renderer converts portal configuration into a responsive splash page.

### Responsibilities

- Render the selected template.
- Apply customer branding.
- Display uploaded images.
- Render text and fields.
- Apply button styles.
- Adapt layouts to desktop, tablet and mobile.
- Apply device-specific overrides where defined.
- Support editing and preview presentation.

### Interface

```tsx
interface SplashPageProps {
  config: PortalConfig;
  device: "desktop" | "tablet" | "mobile";
  mode: "edit" | "preview" | "published";
}

function SplashPage({
  config,
  device,
  mode,
}: SplashPageProps) {
  // Render the configured portal
}
```

The renderer should remain independent of Zustand and the editor sidebar.

The editor supplies configuration and interaction callbacks, while the renderer remains reusable for future published splash pages.

## 14. Validation

Use Zod for configuration validation.

Validation should cover:

- Valid colour values
- Supported image types and size limits
- Supported text size ranges
- Maximum of two guest fields
- Supported field types
- Required template properties
- Valid button configuration
- Valid responsive override properties

All templates should conform to the same configuration schema.

## 15. Optional Product Enhancements

### Designs

Users keep a library of named designs, each a saved portal configuration and template. The library at `/` lists them as cards with a rendered thumbnail, last edited time, status and a menu with Rename, Duplicate, Publish / Take offline and Delete. New designs start from a template and are named after it.

Each design opens in the editor at `/designs/[id]`. Saving is explicit (Save button or ⌘S/Ctrl+S), and the toolbar shows "Unsaved changes" whenever the editor differs from the last save. Leaving with unsaved changes asks for confirmation. Device mode, canvas mode and selection are never saved.

All persistence goes through one async `DesignRepository` interface. The demo implements it with localStorage, inlining uploaded images as data URLs on save. A real backend replaces this implementation without changing the UI.

### Publish and Live

Publishing freezes a snapshot of a design's saved configuration as the single live page. Later edits don't reach guests until the design is published again.

- At most one design is live. Publishing replaces the live design, after a confirmation naming both designs. A first publish and republishing the live design need no confirmation.
- Publishing from the editor saves unsaved changes first.
- Take offline clears the live page, after a confirmation.
- The live design can't be deleted until it's taken offline.
- Each design shows a status: Draft, Live, or "Live · unpublished changes" when its saved configuration differs from the snapshot.

`/live` renders the snapshot with `SplashPage` in `published` mode, as a guest would see it, and never makes a network connection. When nothing is live it says so and links back to the library.

### Undo and Redo

Maintain configuration history for reversible edits.

### Export

Potential formats:

- JSON
- PNG screenshot
- HTML/CSS
- Published web page

### Website Branding Import

Allow users to enter a website URL and extract branding such as business name, logo, colours and relevant imagery.

Extracted information can populate an editable portal configuration.

### AI-Assisted Design

Use an AI model to generate or modify portal configurations based on branding assets, templates or natural-language instructions.

AI-generated output should conform to the portal schema and use the existing renderer.

## 16. Proposed Future Infrastructure

The following services represent a possible production extension and are not required for the standalone editor.

| Capability | Proposed Technology |
|---|---|
| Hosting | Vercel |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Asset storage | Supabase Storage |
| Transactional email | Resend |
| AI generation | LLM API |
| Background workflows | Trigger.dev or equivalent |
| Network integration | Hardware/API adapter |

### Conceptual Flow

```text
Administrator
       |
       v
Rental Created
       |
       v
Customer Invitation
       |
       v
Passwordless Login
       |
       v
Splash Page Editor
       |
       +--- Templates
       +--- Desktop / Tablet / Mobile Editing
       +--- Branding / AI
       +--- Zustand Configuration
       |
       v
Responsive Portal Renderer
       |
       v
Published Portal
       |
       v
Network Integration
       |
       v
Guest Wi-Fi Splash Page
```

### Potential Rental Lifecycle

1. Administrator creates a rental.
2. Customer workspace is provisioned.
3. Customer receives a secure invitation.
4. Customer authenticates.
5. Customer designs and publishes their portal.
6. Portal is associated with the rental.
7. Portal becomes active according to rental status.
8. Portal is deactivated when the rental ends.

The editor and renderer should remain independent of authentication, rental management and network hardware integration.

## 17. Acceptance Criteria

### Application and Architecture

- [ ] Application runs within a Turborepo monorepo.
- [ ] Frontend uses Next.js, TypeScript, Tailwind CSS and shadcn/ui.
- [ ] Editor uses a consistent application design system.
- [ ] Zustand manages portal configuration.
- [ ] Renderer consumes structured configuration.
- [ ] Templates share the same rendering system.

### Templates and Customisation

- [ ] Multiple templates are available.
- [ ] Users can select and customise templates.
- [ ] Users can upload logos and images.
- [ ] Users can upload a background image.
- [ ] Users can select a background colour.
- [ ] Users can add and edit text.
- [ ] Users can adjust text size and colour.
- [ ] Users can configure up to two guest input fields.
- [ ] Users can customise Connect button background and text colours.

### Desktop, Tablet and Mobile Editing

- [ ] Desktop editing mode is available.
- [ ] Tablet editing mode is available.
- [ ] Mobile editing mode is available.
- [ ] Users can switch between device modes.
- [ ] Every mode supports the full editing workflow.
- [ ] Users can select elements within any canvas.
- [ ] Changes update immediately.
- [ ] Shared changes appear in every device mode.
- [ ] Device-specific overrides are explicit, marked and clearable.
- [ ] Responsive layouts adapt to each viewport.
- [ ] Switching modes preserves edits.
- [ ] Preview-only presentation is available without editing indicators.

### Usability

- [ ] Controls are intuitive for non-technical users.
- [ ] The interface provides immediate visual feedback.
- [ ] Invalid configuration values are handled.
- [ ] The application is responsive.

## 18. Technical References

- Turborepo: https://turborepo.dev/
- Next.js: https://nextjs.org/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/
- Zustand: https://zustand.docs.pmnd.rs/
- Zod: https://zod.dev/