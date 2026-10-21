# 01: Foundation: editor shell, live canvas and device modes

**What to build:** A user opens the editor and sees the application toolbar, the properties sidebar and a design canvas showing a splash page. Changing the background colour in the sidebar updates the canvas immediately. A Desktop | Mobile segmented control in the toolbar switches the canvas between a wide desktop frame and a phone-sized frame, each scaled to fit the workspace without altering the design, and switching never discards edits. This is the tracer bullet through every layer: the `PortalConfig` Zod schema and defaults in a new `packages/portal`, the `SplashPage({ config, device, mode })` renderer, the Zustand store, and the editor UI.

Tailwind, shadcn/ui and the editor theme tokens (stone and orange, light and dark) are already installed in `apps/web`. Build on them rather than reinstalling or redefining them.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Placeholder `apps/docs` app is removed, and nothing in the workspace or Turborepo config references it
- [x] Zustand, Zod and Lucide React are installed where the spec places them (`apps/web`, `packages/portal`)
- [x] Vitest is set up and wired into a `test` Turborepo task (approved as an addition to the spec's stack)
- [x] shadcn/ui is initialised for `apps/web` (`components.json`), with the primitives the shell needs added there
- [x] `packages/portal` exports a minimal `PortalConfig` Zod schema (at least one heading and a background colour), its inferred type and a valid default config
- [x] Schema rejects invalid colour values (tested)
- [x] `SplashPage` renders a config for `desktop` and `mobile` and imports nothing from Zustand or editor code
- [x] Zustand store holds `config` and `deviceMode`, with actions to update the background and set the device mode (tested)
- [x] Editor shell renders toolbar, sidebar and canvas from the existing theme tokens and shadcn/ui components, styled with Tailwind utilities
- [x] Customer colours are scoped to the canvas and never override the editor's `:root` tokens
- [x] Background colour control updates the canvas immediately; invalid input is handled without breaking the canvas
- [x] Desktop | Mobile switcher changes the canvas frame; the canvas scales to fit the workspace, and edits survive switching
- [x] AGENTS.md is updated: the stack is installed, `apps/docs` and port 3001 are gone, the test command is listed, and the architecture section says shadcn/ui components and theme tokens live in `apps/web` until a second workspace needs them
- [x] `lint`, `check-types` and the tests are run for every workspace touched, and each is reported as passed, failed (with output) or not run
