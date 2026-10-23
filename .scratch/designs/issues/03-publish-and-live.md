# 03: Publish and the live page

**What to build:** A user can publish one design at a time, which makes it live. Publishing freezes a snapshot, so later edits don't reach guests until the user publishes again. Every design shows whether it's a Draft, Live or Live with unpublished changes. Publishing over another live design, and taking a design offline, both ask for confirmation first. The live design can't be deleted until it's taken offline. A `/live` page shows the live snapshot as a guest would see it. See `.scratch/designs/spec.md`.

**Blocked by:** 02

**Status:** done

- [x] The repository gains `publish`, `unpublish` and `getLive`, and the single live record is `{ designId, designName, templateId, config, publishedAt }` (tested: publishing replaces the previous live record, later saves don't change the snapshot, unpublish clears it)
- [x] `remove` rejects for the live design (tested), and the live card's Delete is disabled with the hint "Take it offline before deleting"
- [x] A pure status function returns `draft`, `live` or `live-changed` from a design and the live record, using the existing deep-equality helper (tested)
- [x] Status badges show Draft, Live or "Live · unpublished changes" on library cards and in the editor toolbar
- [x] Publish and Take offline are available from the card menu and the editor toolbar, and publishing from the editor saves any unsaved changes first
- [x] Publishing asks for confirmation, naming both designs, only when it would replace a different live design. A first publish and republishing the live design go straight through. Take offline always asks for confirmation. Use the shadcn alert dialog
- [x] `/live` renders the live snapshot with `SplashPage` in `mode: "published"`, makes no network connection, and shows a "Nothing is live" state with a link to the library when nothing is live. The Live badge links to it as "View live"
- [x] `.scratch/editor/spec.md` describes Designs, Publish and Live
- [x] `lint`, `check-types`, tests and `build` are run for every workspace touched, and each is reported as passed, failed (with output) or not run
