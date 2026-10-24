# 02: Stream replies into the canvas, with Stop and failure recovery

**What to build:** The page changes on the canvas while the assistant's reply arrives, instead of all at once at the end, and the chat shows the summary as it streams. Streamed chunks add no undo steps, and the finished reply is still one. The customer can press **Stop** part-way, and a stopped or failed reply puts the page back exactly as it was before the message, with a clear error in the chat. Undo and redo wait until the reply has finished. See `../spec.md`.

**Blocked by:** 01

**Status:** done

- [x] The store's `generationBase` records the design before a reply starts streaming, and loading a design clears it
- [x] `previewGeneratedConfig(config)` sets the config without history, records the base on the first chunk and keeps the selection only if that element still exists (tested)
- [x] `finishGeneration(null)` restores the base, and a reply that finishes before any preview uses the current state as its base (tested)
- [x] Undo and redo are ignored while a reply streams (tested)
- [x] `mergeGeneratedDesign` keeps the current design until each part streams in and skips texts whose id hasn't arrived yet, and every chunk merges onto the base captured when the message was sent (tested)
- [x] The route passes the request's abort signal to the model, so Stop cancels the model call
- [x] While streaming, Send becomes Stop and a spinner bubble shows the streamed reply or "Designing…"
- [x] Errors show in a `role="alert"` line with the route's message, or "The assistant couldn't finish that. Try again." when it sent none
- [x] Checked in the running app: the canvas follows the stream, and Stop leaves the page unchanged
- [x] `lint`, `check-types` and `test` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
