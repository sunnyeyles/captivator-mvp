# 08: Extend device overrides to layout and other elements

**What to build:** A user editing in Desktop or Mobile mode can override spacing and element width, not just font size and alignment, and can override styles on guest fields, the Connect button and the logo as well as text. Ticket 06 built the override mechanism for text only (font size and alignment), because text had no spacing or width yet and the other elements didn't exist on its branch. This ticket opts the remaining elements in with the same mechanism and the same sidebar affordances: an explicit override action, a visible overridden marker, and a way to clear back to the shared value.

**Blocked by:** 05, 06

**Status:** ready-for-agent

- [ ] Spacing and element width are modelled as shared style properties where the spec's layout needs them, with validated ranges (tested)
- [ ] Text, guest fields, the Connect button and the logo each support per-device overrides for the properties that make sense for them, using ticket 06's helpers rather than a second mechanism (tested)
- [ ] Renderer resolves every overridable property as device override, falling back to the shared value (tested)
- [ ] Sidebar controls for each element offer an explicit override for the active device, mark overridden properties and let the user clear them
- [ ] Shared edits still appear in both modes wherever no override exists, and overrides survive switching devices, undo/redo and template changes behave sensibly (a template switch replaces overrides with the template's)
- [ ] `lint`, `check-types`, tests and `build` are run for every workspace touched, and each is reported as passed, failed (with output) or not run
