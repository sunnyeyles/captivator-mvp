# 04: Remove the override UI

**What to build:** Element controls lose their per-device override controls. They show the value used on the active device, and every edit sets the shared value and clears that property's overrides on every device. Background image position stays per device. See `../spec.md`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `clearOverridesFor(element, keys)` in `@repo/portal` (tested)
- [ ] Store updates for text, fields, button and logo clear the changed keys' overrides, and the override actions for them are gone (tested)
- [ ] Spec §6.6 describes overrides as coming only from templates, brand fitting and background positions
