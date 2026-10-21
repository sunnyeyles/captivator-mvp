# 06: Device-specific overrides

**What to build:** While editing in Desktop or Mobile mode, a user can explicitly override supported styles for that device only, such as font size, text alignment, spacing and element width, without duplicating content. Properties with no override fall back to the shared value. The sidebar shows which properties are overridden for the active device and lets the user clear an override.

**Blocked by:** 02

**Status:** done

- [x] Schema supports optional per-device overrides for a defined set of style properties and validates them like their shared counterparts (tested)
- [x] Renderer resolves each style as device override, falling back to the shared value (tested)
- [x] Sidebar controls let the user choose to override a property for the active device rather than doing so automatically
- [x] Overridden properties are visibly marked and can be cleared back to the shared value
- [x] Shared edits still appear in both modes wherever no override exists
- [x] Switching device modes preserves all overrides
