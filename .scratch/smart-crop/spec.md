# Smart background image cropping

**Status:** done

## Problem Statement

A customer who uploads a background image gets one crop for every device. The renderer draws the image with `cover` and one of five fixed keywords (centre, top, bottom, left, right), shared by desktop, tablet and mobile. A wide photo framed for the 1280 × 800 desktop canvas loses most of its width on the 390 × 844 phone canvas, so the subject (a face, a stage, a logo on a wall) often ends up cut off on mobile. The only fix is to pick another keyword, which moves the image on every device at once, so getting mobile right breaks desktop. Non-technical customers shouldn't need to know how `cover` cropping works to get a background that looks right everywhere.

## Solution

When a customer adds a background image, the editor analyses it in the browser with Smartcrop.js and works out where the important content is. It then gives the image a recommended position for each device (desktop, tablet and mobile), so the subject stays visible at each device's shape. The image is never cut or re-encoded. The original file stays as it is, and the renderer shows it with CSS `object-fit: cover` and a per-device `object-position`.

The canvas shows the automatic position right away. If the customer disagrees, they choose **Reposition** and drag the image (or nudge it with the arrow keys) in the active device. That adjustment belongs to that device only, and the other devices keep their own positions. The sidebar shows whether the active device uses the automatic position or an adjusted one, and **Reset to automatic** brings back the recommendation. Positions are part of the portal config, so undo/redo, device switching and anything that later saves or publishes the config keep them. The published page needs no JavaScript to position the image.

If analysis fails or the image can't be analysed, the image is still placed, centred, with a quiet note, and the customer can reposition it by hand.

## User Stories

1. As a customer, I want my uploaded background image to be positioned automatically, so that I don't have to understand cropping to get a good result.
2. As a customer, I want the subject of my photo to stay visible on the phone layout, so that guests on mobile see what I intended.
3. As a customer, I want the subject of my photo to stay visible on the desktop layout, so that guests on laptops see what I intended.
4. As a customer, I want the subject of my photo to stay visible on the tablet layout, so that every device the editor offers is covered.
5. As a customer, I want each device to get its own recommended position from a single upload, so that I never upload separate images per device.
6. As a customer, I want my original image kept exactly as uploaded, so that no quality is lost and I can reposition freely later.
7. As a customer, I want the automatically positioned image to appear on the canvas as soon as the upload finishes, so that I get immediate feedback.
8. As a customer, I want to see that the editor is working out the best crop while it analyses, so that a short pause doesn't look like a broken upload.
9. As a customer, I want to drag the background image in the canvas to move it, so that I can fix a recommendation I don't like.
10. As a customer, I want dragging only to move the image along the side that is actually cropped, so that the image never leaves a gap at the edge.
11. As a customer, I want a repositioning I make on mobile not to change desktop or tablet, so that fixing one device never breaks another.
12. As a customer, I want a repositioning I make on desktop not to change mobile or tablet, so that each device is tuned on its own.
13. As a customer, I want to switch device while repositioning and carry on adjusting the new device, so that I can tune all three in one go.
14. As a customer, I want my adjustments kept when I switch device modes, so that I never lose work by looking at another layout.
15. As a customer, I want to see in the sidebar whether the active device uses the automatic position or my adjustment, so that I know what I'm looking at.
16. As a customer, I want a "Reset to automatic" action for the active device, so that I can undo my adjustment without remembering where it was.
17. As a customer, I want reset to restore the recommendation without the editor analysing the image again, so that it's instant.
18. As a customer, I want each drag to be a single undo step, so that undo reverses a whole adjustment rather than one pixel at a time.
19. As a customer, I want undo and redo to restore image positions exactly, so that experimenting is safe.
20. As a customer, I want undoing an upload to remove the image and its positions in one step, so that the automatic position isn't a separate thing to undo.
21. As a customer, I want replacing the background image to give the new image its own automatic positions, so that adjustments made for the old photo don't misplace the new one.
22. As a customer, I want replacing the image to keep my chosen fit and overlay, so that only the photo changes.
23. As a customer using a keyboard, I want to move the image with the arrow keys while repositioning, so that I can adjust it without a mouse.
24. As a customer using a keyboard, I want Shift + arrow to move the image in bigger steps, so that large moves aren't tedious.
25. As a customer, I want Escape or a Done button to leave reposition mode, so that I can go back to selecting elements.
26. As a customer, I want clicks on text, fields or the button not to start a drag outside reposition mode, so that selecting elements still works as before.
27. As a customer, I want preview mode to show the image exactly where I positioned it, without any reposition handles, so that I see what guests will see.
28. As a customer, I want my published splash page to keep the positions I set for each device, so that guests see the page as designed.
29. As a guest on a phone, I want the splash page background to show the venue's subject rather than an arbitrary slice, so that the page looks intentional.
30. As a guest, I want the splash page to load without extra scripts or image processing, so that it appears quickly on a captive portal connection.
31. As a customer, I want an image the editor can't analyse to still upload and appear centred, so that a failed analysis never blocks me.
32. As a customer, I want a short, non-alarming note when automatic positioning wasn't possible, so that I know to check the image myself.
33. As a customer, I want an upload that is the wrong type or too large to be rejected with the existing message, so that the rules stay the same.
34. As a customer, I want a slow analysis to give up after a short time and place the image centred, so that I'm never stuck waiting.
35. As a customer, I want uploading a second image while the first is still being analysed to show only the second image, so that a late result never overwrites my newer choice.
36. As a customer, I want the "Fit" option to keep working, so that I can still show the whole image when I prefer.
37. As a customer using "Fit", I want automatic cropping not to shift my letterboxed image off centre, so that the recommendation only applies where something is actually cropped.
38. As a customer, I want an image whose shape already matches a device to sit naturally without odd offsets, so that there's nothing to fix.
39. As a customer, I want templates with built-in images to look as designed without waiting for analysis, so that switching templates stays instant.
40. As a customer, I want switching templates to behave as it does today (the template's config replaces mine), so that nothing surprising happens.
41. As a customer who imports branding from my website, I want imported background imagery to be positioned automatically in the same way, so that imported and uploaded images behave the same.
42. As a customer who imports branding, I want an imported image that can't be analysed to fall back to centred like an upload, so that importing never fails because of cropping.
43. As a customer, I want the editor to stay responsive while an image is analysed, so that large photos don't freeze the page.
44. As a customer, I want the editor's own colours and styling to stay the same while repositioning, so that customer branding never changes the editor interface.
45. As an operator, I want image analysis to run in the customer's browser, so that the feature adds no server compute or cloud cost.
46. As an operator, I want no cropped copies of images to be generated or stored, so that storage and bandwidth stay at one file per image.
47. As an operator, I want each image analysed once, when it's added, so that undo, redo, device switches, resets and published page views never repeat the work.
48. As an operator, I want the Smartcrop library loaded only when a customer first adds an image, so that the editor's initial load stays small.
49. As a developer, I want image positions validated by the portal schema like every other config value, so that the renderer can trust them.
50. As a developer, I want per-device positions to use the existing device-override helpers, so that there is one override mechanism in the codebase.
51. As a developer, I want the renderer to stay free of Zustand, Smartcrop and editor code, so that it stays reusable for published pages.
52. As a developer, I want the crop-to-position maths in one pure, tested module, so that a conversion bug is caught without a browser.
53. As a developer building the website-branding importer, I want one documented entry point that turns an image into a placed background with recommendations, so that the importer doesn't reimplement analysis.

## Implementation Decisions

### Scope of "image"

- Smart cropping applies to the **background image** only. It's the only image the renderer crops (`cover`). The logo renders with `object-contain`, is never cropped and is unchanged.
- Recommendations are computed for all three devices the codebase supports (desktop, tablet, mobile), not just desktop and mobile. One analysis yields all three for little extra cost, and tablet would otherwise be the one device left behind.

### Data model (portal schema)

- The background image's `position` changes from the five-keyword enum to a numeric position: `{ x, y }`, each a percentage from 0 to 100 (decimals allowed, so drags can be smooth), with the same meaning as the two values of CSS `object-position`. 50/50 is centred. The `backgroundPositions` keyword list and its export are removed.
- The background image gains a `recommended` value: either `null` (no recommendation, because analysis failed, didn't run or the image came from a template) or an object with a required `{ x, y }` for each of desktop, tablet and mobile. It's stored in the config so that reset, undo, reload and published pages never need to analyse again.
- The background image gains optional per-device `overrides` built with the existing device-override schema builder, opting in only the `position` key. A manual adjustment is a device override of `position`, exactly like the logo's `maxHeight` override.
- The shared `position` stays as the final fallback (centred by default). Templates may set it for their bundled images. No UI edits it directly.
- **Resolution order** for a device: that device's position override, then, only when fit is `cover`, `recommended` for that device, then the shared `position`. With `contain` the whole image is visible, so the cover-based recommendation is skipped. Otherwise it would push a letterboxed image off centre.
- The portal package exports one resolver for this (for example, the background image resolved for a device). It layers the recommendation under the existing device-override resolver rather than replacing it.
- The default settings for a new background image become: fit `cover`, position centred, `recommended: null`, overlay `null`, no overrides. The Event template moves from `"center"` to the centred numeric position with `recommended: null`.
- Templates never ship or trigger analysis. Their images are hand-authored presets.
- No migration is needed. Nothing persists configs yet (no local persistence, database or publishing exists), so the only `"center"` values are in source and tests and change with the schema.
- **Departure from MVP spec §6.6:** that section says the user explicitly chooses to override a property for a device. Background position is inherently per device (each device has its own recommendation), so a drag in reposition mode, which always acts on the active device, _is_ the explicit choice, and the sidebar marks and clears it like any other override. §6.6 also lists "image positioning" as a future override, and this delivers it. Update §6.6 and §9 of the MVP spec to say so when the feature lands.

### Crop geometry (new pure module in the web app)

- **Smartcrop rectangle → object-position.** Smartcrop is called with the device's aspect ratio and its default `minScale`/`maxScale` of 1. That makes the returned rectangle the largest region of that aspect, which is exactly the region `cover` shows. For an analysed image of width W and a crop at x with width w: if `W − w` is more than one analysed pixel, position x = `x / (W − w) × 100`, otherwise 50 (no overflow on that axis, so the value is meaningless and centred is the stable choice). Same for y with heights. Results are clamped to 0–100 and rounded to one decimal place.
- Percentages don't depend on scale, so the conversion uses the dimensions of the image Smartcrop actually analysed (the downscaled bitmap), never the original's. Smartcrop truncates coordinates to integers after its own prescale, which is why the result is clamped.
- **Device aspect ratios** come from the canvas frame sizes the design canvas already uses (1280 × 800, 820 × 1180, 390 × 844). That constant is shared within the web app instead of being duplicated. Real guest viewports vary, but percentage positions degrade gracefully across nearby aspect ratios, which is why percentages are stored rather than pixel offsets.
- **Drag → position.** For one axis, a position p places the image's offset at `p × (frame − rendered)`, where `rendered` is the image's natural size times the fit scale (`max` of frame/natural ratios for cover, `min` for contain). So a pointer delta d in page pixels changes p by `d / (frame − rendered) × 100`, clamped to 0–100. When `frame − rendered` is zero the axis doesn't move. Screen-pixel deltas are divided by the canvas scale first. One formula covers cover and contain, and the sign works out on its own.
- **Keyboard nudges** are 1 percentage point per arrow press and 10 with Shift, clamped.

### Image analysis (web app)

- **Dependency:** `smartcrop` 2.0.5 (MIT, no dependencies), added to the web app only, since only the editor analyses. The user approved it in the request. It ships no TypeScript types and there's no `@types` package, so the web app declares a minimal local module type covering only `crop(image, { width, height })` and its `{ topCrop: { x, y, width, height } }` result.
- **Lazy loading:** the library is loaded with a dynamic import the first time an image is analysed, so it never enters the editor's initial bundle.
- **One entry point** (for example "prepare background image") takes an image `Blob`/`File` and returns `{ src, recommended }`, where `src` is a new object URL and `recommended` is the per-device recommendation or `null`. The upload control and the future website-branding importer both use it.
- **Steps:** decode and downscale the Blob with `createImageBitmap`, longest side about 512 px, which decodes off the main thread and avoids Smartcrop drawing a full-resolution canvas (a 4000 × 3000 photo would be about 48 MB of pixels). Then run Smartcrop once per device aspect on that bitmap (Smartcrop prescales again to about 256 px internally), convert each rectangle with the geometry module, and close the bitmap.
- **Analysis reads the Blob, never a URL.** Pixels come from the customer's own file, so canvas tainting and CORS can't come up.
- **Timeout:** if analysis hasn't finished within 2 seconds the image is placed with `recommended: null`, and any later result is discarded.
- **Ordering:** the upload control keeps a token for its latest request, and a result for a superseded upload is dropped, so the last image chosen always wins.
- **Placement waits for analysis** (bounded by the timeout), so the image arrives with its recommendation in one store action and one undo step. Placing first and patching the recommendation in later was rejected: it would mean a second history entry or a mutation outside history, plus a race against undo.

### State management (Zustand editor store)

New actions follow the store's existing patterns: validate through the schema, reject invalid edits, and merge drags into one undo step with the existing gesture mechanism.

- `placeBackgroundImage(src, recommended)` sets the background image's `src` and `recommended`, keeps the current fit and overlay (or the defaults when there was no image), and drops any position overrides from a previous image. It is one undo step. It replaces the current upload path, which only spreads `src` into the old settings.
- `overrideBackgroundPosition(device, position)` sets that device's position override via the shared override helper, and is validated by the background schema. Its gesture key follows the existing override convention (`override-<device>`, key `position`, a background id), so a continuous drag or a run of key presses becomes one undo step.
- `clearBackgroundPositionOverride(device)` removes that device's override via the shared clear helper. This is "Reset to automatic". It falls back to the stored recommendation, or to the shared position when there is none.
- `repositioning: boolean` is editor UI state, not history (like `canvasMode`), and `setRepositioning(on)` sets it. Entering reposition mode clears the selected element. Switching to preview, removing the background image, or switching the background to colour turns it off. The canvas also only shows the reposition layer while the flag is set, the canvas is in edit mode and an image is shown, computed during render so a stale flag can never show it.
- Switching device leaves `repositioning` and all positions untouched. Undo/redo restore positions because they're part of the config. A template switch replaces the background as it does today.
- Object-URL cleanup needs no change: the existing reachability sweep already covers `background.image.src`.

### Renderer integration (portal package)

- The background image moves from a CSS `background-image` on the page root to a decorative image element filling the page behind the overlay and content. It has an empty `alt`, `aria-hidden`, is not draggable, ignores pointer events, and is styled with `object-fit` from `fit` and `object-position` from the resolved device position (for example `37.5% 20%`). The root keeps `background-color`, which still fills any area `contain` leaves.
- This follows the request to use `object-fit`/`object-position`, gives the published page a real image element for browser loading priorities, and lets clicks on empty canvas reach the root as they do today, so click-to-deselect is unchanged.
- The renderer computes position only through the portal package's resolver. It imports nothing from Smartcrop, Zustand or the editor, and gains no new props. Edit, preview and published modes render the same position.
- Guest-label contrast logic is unchanged, since it doesn't depend on position.

### Manual editing interaction (web app)

- **Sidebar (background group):** the five-keyword position toggle is removed. When a background image is set, the group shows a **Reposition** button, plus a status line for the active device: "Automatic position", "Centred (no automatic position)" when `recommended` is null and nothing is overridden, or "Adjusted on <device>" with the device icon. A **Reset to automatic** button appears only when the active device has an override. The marker uses the existing override field's visual language: primary left border, device icon, and a ghost reset button with an aria-label that names the device.
- **Reposition layer (design canvas):** this is editor code laid over the scaled frame, not part of the renderer. While it's shown, it captures pointer events, so elements can't be selected and the drag always moves the background, even under text and fields. It uses the editor theme: a selection-coloured outline, a grab/grabbing cursor, and a small "Drag to reposition · Esc to finish" hint with a Done button. Customer colours are never applied to it.
- Pointer handling uses pointer capture. Each move computes the new position with the drag geometry from the position at pointer-down, and calls `overrideBackgroundPosition` for the active device. Updates may be throttled to one per animation frame.
- The layer is focusable with an accessible name ("Background image position") and instructions. Arrow and Shift+arrow nudge, and Escape or Enter leaves reposition mode.
- The layer needs the image's natural size. It reads it from a small per-`src` cache in the web app, filled when the image is prepared, and for template or other unanalysed images by loading the `src` once.

### Website-branding importer integration (contract)

- The importer doesn't exist yet (MVP spec §15), so this spec fixes the contract it must follow and builds no importer.
- Cross-origin images on customer websites usually lack CORS headers, so the browser can't read their pixels. The importer must fetch imagery server-side and return the bytes to the client, checked against the same image type and size rules as uploads. The client wraps the bytes as a Blob and runs the same analysis the entry point uses. The analysis is exported on its own (Blob in, per-device recommendation or `null` out), and "prepare background image" composes it with the object URL. The website-branding importer (`.scratch/website-branding/spec.md`) keeps the image as an embedded data URL, because its draft brand lives outside undo history where the object-URL sweep would revoke a URL the chooser still shows. It stores the recommendation in its brand profile and places the image through its branded template config instead of `placeBackgroundImage`.
- An imported image the importer can't fetch is the importer's own error. An image that is fetched but can't be analysed falls back to centred, the same as an upload.

### Asset storage, CORS and persistence

- There is no asset storage, CORS configuration or persistence in the codebase today. Images are browser object URLs while editing, and templates use inline data URIs.
- The design depends on none of these. Analysis runs once on the local Blob before any upload to storage, and positions are plain numbers in the portal config. When Supabase Storage, local persistence or publishing arrive (MVP spec §15–16), they store and serve the original image unchanged and carry the positions with the config. No storage CORS rule, image transform service or derived image is needed for this feature.

### Performance and cost

- **No server work:** no new routes, no server analysis, no stored derivatives. Cloud cost doesn't change.
- **Analyse once, when added:** device switches, undo/redo, reset, template switches, preview and published views never analyse. Re-uploading the same file analyses again because it's a new object URL. That's accepted rather than adding content hashing.
- **Budget:** on a mid-range laptop, preparing a 5 MB, about 4000 px JPEG takes under 500 ms from file selection to placement, and the Smartcrop step adds no main-thread task over 100 ms. If profiling in phase 3 breaks the budget, moving analysis into a worker via Smartcrop's `canvasFactory` and `OffscreenCanvas` is the planned next step, not part of this spec.
- **Published pages** position the image with CSS only.

### Error handling

- **Type and size validation:** the existing upload rules (PNG, JPEG or WebP, up to 5 MB) and messages run before analysis. A rejected file is never analysed.
- **Fallback:** any failure is caught inside the entry point and gives `recommended: null`, never a thrown error to the UI. That covers a decode failure (`createImageBitmap` rejects), Smartcrop missing or throwing, the dynamic import failing (for example offline), the timeout, and a zero-sized image. The image is still placed, centred.
- **Note:** with a null recommendation, the upload control shows a muted, non-alert note ("Couldn't find the subject automatically, so the image is centred. Use Reposition to adjust it.") until the next upload or removal.
- **No overflow:** an image whose aspect matches a device gives 50 on the axis with no overflow, so it never gets an arbitrary offset.
- **Invalid positions:** a position outside 0–100 or not a number is rejected by the schema in the store, like every other invalid edit.

### Implementation phases

Each phase leaves the app working and passing lint, check-types and test.

1. **Numeric, per-device positions in the schema and renderer.** Make the schema change, add the resolver, render through an image element with `object-fit`/`object-position`, migrate the Event template, defaults and tests, and remove the keyword toggle from the sidebar. Every image renders centred, or at its shared position.
2. **Manual repositioning.** Add the store actions and repositioning state, the drag and keyboard geometry, the reposition layer, the sidebar status and Reset. Everything works with `recommended: null`.
3. **Smartcrop recommendations.** Add the dependency and local types, the rectangle-to-position geometry, the "prepare background image" entry point with lazy import, downscale, timeout and ordering, and the upload control integration with its analysing and fallback states. Profile against the budget.
4. **Docs and importer contract.** Update MVP spec §6.6 and §9. Whoever builds the importer adopts the contract above, and that work is tracked with the importer, not here.

### Acceptance criteria

- [ ] Uploading a PNG, JPEG or WebP background image places it with a recommended position for desktop, tablet and mobile in a single undo step.
- [ ] The original image is shown unmodified. No cropped or re-encoded copy is created or stored.
- [ ] The renderer shows the background with `object-fit` and a per-device `object-position`, and edit, preview and published modes agree.
- [ ] Resolution is override, then recommendation (cover only), then shared position, for each device.
- [ ] Dragging in reposition mode changes only the active device's position, and other devices are unchanged.
- [ ] A drag gesture is one undo step, and undo/redo restore positions exactly.
- [ ] Switching device mode keeps every device's adjustment.
- [ ] The sidebar shows Automatic, Centred or Adjusted for the active device, and Reset to automatic clears only that device's adjustment without re-analysing.
- [ ] Replacing an image gives fresh recommendations, clears old adjustments, and keeps fit and overlay.
- [ ] Arrow and Shift+arrow nudge, and Escape/Done leave reposition mode. Preview hides the reposition layer.
- [ ] A failed, unsupported or timed-out analysis still places the image centred with a non-alert note.
- [ ] A stale analysis result never replaces a newer upload.
- [ ] Smartcrop isn't in the editor's initial bundle, and the renderer imports no Smartcrop, Zustand or editor code.
- [ ] Templates render their images without analysis.
- [ ] MVP spec §6.6 and §9 describe per-device image positioning.
- [ ] `lint`, `check-types` and `test` pass for `@repo/portal` and `web`, and `build` passes for `web`.

## Testing Decisions

- **What a good test is:** it drives a module through its public interface and asserts what a user or caller can see: rendered markup, store state after actions, returned positions. It never asserts internal helpers, call order or Smartcrop's own scoring. Tests sit beside the code as `*.test.ts(x)` and run in Vitest's node environment, which has no DOM or canvas.
- **Seams (three, two of them existing):**
  1. **Renderer, via `SplashPage` rendered to static markup (existing).** For each device: the image element carries the right `object-fit` and `object-position`. Override beats recommendation, which beats the shared position. `contain` ignores the recommendation. Published and preview modes match edit mode. Colour mode renders no image element. The root still carries `background-color`. Prior art is the renderer tests that check background image, size and position per device and on device switching. Those assertions move from `background-*` styles to the image element.
  2. **Editor store, via `usePortalEditorStore` actions and state (existing).** Placing sets `src` and `recommended` in one undo step and clears old overrides. An override on one device leaves the others unchanged. Clearing falls back to the recommendation, or to the shared position when there is none. A run of overrides inside the gesture window is one undo step. Invalid positions are rejected. Entering reposition mode clears selection, and preview or image removal leaves it. Device switches keep positions. Template switch and reset behave as today. Prior art is the store tests for logo, text and button overrides, gesture merging with fake timers, and history.
  3. **Crop geometry, a new pure module in the web app.** Rectangle-to-position for landscape, portrait and square images at each device aspect, including no overflow (50), crops at the far edges (0 and 100), truncation clamping, and invariance under scale. Drag delta to position for cover and contain, both axes, clamping, a zero denominator, and canvas scale. Prior art is the pure module tests in the web app (images and equality helpers) and the portal's override tests.
- **Schema:** schema tests cover the new position range and the `recommended` and `overrides` shapes, following the existing schema tests.
- **Not unit-tested:** the "prepare background image" entry point, the Smartcrop adapter and the reposition layer's pointer wiring need `createImageBitmap`, canvas and pointer events, which the node test environment doesn't have. Their logic is pushed into the geometry module and the store, and what's left is checked manually in the running app: upload a landscape photo with an off-centre subject and confirm the subject is visible on mobile, drag on each device, reset, undo, then upload a corrupt file renamed `.jpg` and confirm the centred fallback and note. Adding jsdom or a canvas polyfill just for these thin adapters isn't worth the dependency.

## Out of Scope

- Smart cropping or repositioning of the logo, which is never cropped.
- Zooming or scaling the image beyond what `cover`/`contain` gives. Position only.
- Generating, storing or serving cropped or resized copies of images.
- Server-side analysis, a worker-based analyser (unless the phase 3 budget forces it), and face detection or Smartcrop "boost" regions.
- Building the website-branding importer, asset storage, local persistence or publishing. This spec only sets how each must treat images and positions.
- A "re-analyse" action, and deduplicating analysis of identical files by content hash.
- Positions for viewports other than the three device modes.
- Letting customers edit the shared fallback position.

## Further Notes

- Smartcrop 2.0.5 was last published in 2022. It's small, MIT and dependency-free, and runs entirely on canvas, so the age is acceptable. The local type declaration keeps it fenced to one adapter.
- Storing percentages instead of pixel offsets or crop rectangles is what keeps published pages correct at viewport sizes the editor never showed. `object-position` percentages scale with the container in exactly the way the drag geometry assumes.
- **Alternatives considered** (from memory when written, so check current APIs and pricing before switching):
  - _A home-grown edge or entropy heuristic:_ no dependency, but Smartcrop is already a tuned version of the same idea.
  - _MediaPipe Face Detector or BlazeFace:_ much better at keeping faces in frame, but several MB of WASM and model files and only useful for photos of people. If people photos crop badly, the planned follow-up is to feed detected faces into Smartcrop as boost regions, not to replace it.
  - _Saliency models on ONNX Runtime Web or TensorFlow.js:_ best quality, but 4–40 MB models and slow analysis on low-end laptops.
  - _The browser `FaceDetector` API:_ not reliably available across browsers.
  - _Server-side analysis with sharp's `attention` strategy, Google Cloud Vision crop hints or Azure smart cropping:_ rejected because each adds a route, server compute or per-image fees, and needs the image uploaded first. Vision crop hints and sharp's focal point fit the `recommended` shape unchanged, so they're the natural replacement if analysis moves server-side (for example inside the importer).
  - _Image CDNs_ (Cloudinary `g_auto`, imgix, ImageKit, Cloudflare Images `gravity=auto`): rejected because they deliver cropped copies and charge per transformation, against the requirements to keep the original and use `object-position`.
- Keeping `recommended` separate from the overrides is what makes "Reset to automatic" a plain override clear, using the same helper as every other "use shared" action, rather than a new mechanism.
