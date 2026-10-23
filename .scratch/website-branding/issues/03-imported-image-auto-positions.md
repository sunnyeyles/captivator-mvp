# 03: Automatic positions for the imported Event image

**What to build:** The background image imported from the customer's website is positioned automatically per device, just like an uploaded one. The subject stays visible on desktop, tablet and mobile in the Event design, both in the chooser and once applied. After applying, the customer can fine-tune it with Reposition and Reset to automatic. If the image can't be analysed, it falls back to centred, the same as an upload. See the "Alignment with smart-crop" decision in `../spec.md` and the importer contract in `../../smart-crop/spec.md`.

**Blocked by:** 02, smart-crop 02

**Status:** done

- [x] After a successful import, the browser converts the image data URL to a Blob and runs smart-crop's standalone analysis step. It stores the result as `imageRecommended` on the draft brand before the chooser shows the designs. The image stays a data URL, and no object URL is created
- [x] A failed, unsupported or timed-out analysis leaves `imageRecommended: null`, and the Event design is centred. The import still succeeds, and a newer import's result is never replaced by an older one's
- [x] Refresh from website re-analyses, while colour swaps, View designs and template switches never do
- [x] The applied Event design's background uses the recommendation per device, and Reset to automatic returns to it (tested in the store)
- [x] Checked in the running app with a wide image on mobile
- [x] `lint`, `check-types`, `test` and `build` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
