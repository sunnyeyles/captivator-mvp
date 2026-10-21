# 02: Text, canvas selection and Preview mode

**What to build:** A user can add text elements to the splash page, edit their content, and adjust colour, font size, font weight and alignment, and remove them. Clicking any element in the canvas (in either device mode) selects it, shows a selection indicator, and brings up that element's controls in the sidebar. An Edit | Preview toggle shows the splash page without selection indicators or in-canvas editing affordances. This ticket establishes the selection pattern later element types plug into.

**Blocked by:** 01

**Status:** done

- [x] `PortalConfig` holds text elements as structured objects (`id`, `text`, `fontSize`, `color`, `fontWeight`, `textAlign`) per the spec
- [x] Schema enforces supported font size ranges and valid colours (tested)
- [x] Store supports adding, updating and removing text elements, plus `selectedElementId` and `canvasMode` (tested)
- [x] Sidebar Text group lets the user add, edit and remove text and change colour, size, weight and alignment; invalid values are handled
- [x] Renderer accepts a selection callback and selected id from the editor as props, never from the store directly
- [x] Clicking an element in the desktop or mobile canvas selects it and opens its controls; clicking empty canvas clears selection
- [x] Edit | Preview toggle hides selection indicators and editing affordances in both device modes
- [x] Text changes appear in both device modes
