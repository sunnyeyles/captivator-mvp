# 01: One Change design dialog

**What to build:** A Change design dialog with Templates and From your website tabs replaces the toolbar template picker and the sidebar's Templates and Website branding sections. Choosing a template or a branded design replaces the current design as one undoable step. See `../spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Templates tab reuses `TemplateGrid` and closes on select
- [x] Website tab runs the existing import, then closes and opens the brand design chooser
- [x] Closing the dialog aborts a running import
- [x] The toolbar template picker and both sidebar sections are gone
