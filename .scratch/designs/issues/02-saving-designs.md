# 02: Saving designs

**What to build:** A user editing a design can save it with a Save button or ⌘S/Ctrl+S, and always knows whether they have unsaved changes. The indicator reflects real differences from the last save, so undoing back to the saved state clears it. Uploaded logos and backgrounds survive a reload. A failed save shows a clear error, and leaving the editor with unsaved changes asks for confirmation first. See `.scratch/designs/spec.md`.

**Blocked by:** 01

**Status:** done

- [x] The editor store records the last saved state when a design loads and after each successful save, and "unsaved changes" compares the current config and templateId with it (tested: it turns on after an edit, and off after undoing back or saving). The store makes no repository calls
- [x] The toolbar shows an "Unsaved changes" indicator and a Save button with a pending state, and ⌘S/Ctrl+S saves
- [x] On save the stub converts `blob:` image URLs to data URLs, so images survive a reload (tested)
- [x] A storage quota error comes back as a save failure (tested) and is shown to the user, and the design stays marked as unsaved
- [x] The back link asks for confirmation with an in-app dialog when there are unsaved changes, and a `beforeunload` guard covers closing or reloading the tab
- [x] The design name in the toolbar can be renamed inline
- [x] `lint`, `check-types`, tests and `build` are run for every workspace touched, and each is reported as passed, failed (with output) or not run
