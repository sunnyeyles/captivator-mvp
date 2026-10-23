# 01: Per-device background positions and manual repositioning

**What to build:** A customer with a background image can choose Reposition, then drag the image or nudge it with the arrow keys on the canvas. The adjustment applies only to the active device, and each drag is one undo step. The sidebar shows whether the active device uses its automatic position, is centred, or has been adjusted, and Reset to automatic clears that device's adjustment. Under the hood, the background image switches from the five position keywords to a numeric `{ x, y }` position, with an optional per-device recommendation and per-device overrides. The renderer draws the image as a decorative image element with `object-fit` and `object-position`, the same in edit, preview and published modes. Everything works with `recommended: null`, since filling it in automatically is ticket 02. This covers phases 1 and 2 of `../spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

**Coordination:** website-branding 02 writes the Event background in this ticket's position shape and is blocked by it. This ticket and website-branding 01 both change the editor store. They have no logical dependency, so if they run in parallel, expect a merge.

- [x] The background image `position` is numeric `{ x, y }` from 0 to 100. It has `recommended` (a required position for each device, or `null`) and per-device `overrides` of `position` only, built with the existing override builder. The keyword list and its export are removed (tested)
- [x] The portal package exports one resolver per device: the override, then the recommendation (cover only), then the shared position (tested)
- [x] The renderer draws the background as an image element that is decorative, not draggable and ignores pointer events. It uses `object-fit` and the resolved `object-position`, the root keeps `background-color`, and colour mode renders no image. Edit, preview and published modes agree (tested)
- [x] The Event template and the new-image defaults use a centred numeric position with `recommended: null`, and the five-keyword toggle is gone from the sidebar (tested)
- [x] The store has `placeBackgroundImage(src, recommended)` (one undo step that keeps fit and overlay and drops old overrides), `overrideBackgroundPosition(device, position)` (drags merge into one undo step through the gesture mechanism), `clearBackgroundPositionOverride(device)`, and the `repositioning` UI flag with the exit rules in the spec. The upload control places images through `placeBackgroundImage` (tested)
- [x] A pure geometry module turns a drag delta into a position for cover and contain, on both axes, with clamping, a zero denominator and the canvas scale. Arrow keys nudge 1 point and Shift+arrow 10 (tested)
- [x] The reposition layer is editor-themed and focusable with an accessible name. It captures the pointer so drags always move the background, Escape, Enter or Done leaves it, and it never shows in preview
- [x] The sidebar status reads "Automatic position", "Centred (no automatic position)" or "Adjusted on <device>", using the override marker style. Reset to automatic appears only when the active device has an override
- [x] Switching device keeps every device's position. Template switch and reset behave as today
- [x] Checked in the running app on all three devices
- [x] `lint`, `check-types`, `test` and `build` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
