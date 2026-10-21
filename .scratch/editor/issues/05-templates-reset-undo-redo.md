# 05: Templates, reset, undo and redo

**What to build:** A user can pick from a gallery of templates (Minimal, Event, Corporate) in the sidebar Templates group or the toolbar, see the template load into the canvas, and keep editing it. Templates are config presets drawn by the shared renderer, never separate page implementations. The toolbar offers undo and redo over configuration edits, and a reset that returns to the selected template's defaults.

**Blocked by:** 03, 04

**Status:** done

- [x] Minimal (centred logo, heading, fields, Connect button), Event (prominent background image with overlaid branding and content) and Corporate (structured, professional) presets exist
- [x] Every template parses against the same `PortalConfig` schema (tested)
- [x] Templates look right in both desktop and mobile layouts
- [x] Template gallery in the sidebar and a template picker in the toolbar load the chosen preset into the store
- [x] Edits after selecting a template work like any other edit
- [x] Undo and redo step through configuration history; UI state (device mode, selection, canvas mode) is not part of history (tested)
- [x] Reset returns the config to the selected template's defaults and can itself be undone
