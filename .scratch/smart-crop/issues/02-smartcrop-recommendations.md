# 02: Automatic background positions from Smartcrop

**What to build:** When a customer uploads a background image, the editor analyses it in the browser with Smartcrop.js before placing it. The image then arrives already positioned for desktop, tablet and mobile so the subject stays visible on each, all in one undo step. A short "finding the best crop" state shows while it works. If analysis fails, is unsupported or takes longer than 2 seconds, the image is placed centred with a quiet note, and a late result for an older upload never replaces a newer one. The analysis step is also exported on its own so the website-branding importer can reuse it. This covers phases 3 and 4 of `../spec.md`, including the MVP spec updates.

**Blocked by:** 01

**Status:** done

**Coordination:** website-branding 03 calls this ticket's standalone analysis step and is blocked by it.

- [x] `smartcrop` 2.0.5 is added to `web` only, with a minimal local module type. It is loaded with a dynamic import on first use and is not in the editor's initial bundle
- [x] The pure geometry module turns a Smartcrop rectangle into a position, for landscape, portrait and square images at each device's aspect. No overflow gives 50, crops at the far edges give 0 and 100, truncated coordinates are clamped, and the result doesn't depend on scale. Device aspects come from the shared canvas frame sizes (tested)
- [x] The analysis step takes a Blob, downscales it with `createImageBitmap` to about 512 px, runs one crop per device, closes the bitmap, and returns the per-device recommendation or `null`. It never throws. "Prepare background image" combines it with a new object URL to give `{ src, recommended }`, and both are exported for reuse
- [x] Analysis gives up after 2 seconds with `null`. The upload control keeps a token so a superseded upload's result is dropped, and files rejected by type or size are never analysed
- [x] The upload control shows an analysing state, places the image through `placeBackgroundImage` in one undo step, and shows the muted fallback note when the recommendation is `null`
- [x] Templates still render their images without analysis, and the renderer imports no Smartcrop, Zustand or editor code
- [x] Profiled against the budget: a 5 MB, about 4000 px JPEG goes from file selection to placement in under 500 ms, and Smartcrop adds no main-thread task over 100 ms. Results are reported
- [x] MVP spec §6.6 and §9 describe per-device image positioning
- [x] Checked in the running app with a landscape photo, a portrait photo and a file that can't be decoded
- [x] `lint`, `check-types`, `test` and `build` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run

## Comments

- **No local module type:** `smartcrop` 2.0.5 ships its own `index.d.ts`, which type-checks cleanly. A local declaration would only duplicate it or clash with it, so there isn't one.
- **Reposition size cache not pre-filled:** the spec has "prepare background image" fill the reposition layer's per-image size cache. Analysis only sees a Blob, so the reposition layer still loads each image once to measure it.
