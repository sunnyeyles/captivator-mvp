# 03: Refine the design in conversation

**What to build:** After the first design, the customer asks for changes in the same conversation ("make the heading bigger", "collect email only") and the assistant changes only what they asked for. Each message sends the recent conversation and the page as it is now, manual sidebar edits included, so chat and sidebar edits work together. A value the assistant changes applies on every device, while device overrides of values it left alone survive. See `../spec.md`.

**Blocked by:** 01

**Status:** done

- [x] Each request sends the last `CHAT_HISTORY_MAX` messages and `toGeneratedDesign(config)` of the current page, without image sources or device overrides, and the route appends that design to the system prompt (tested: every template's design parses as a request)
- [x] `toGeneratedDesign` round-trips through the merge unchanged (tested)
- [x] The system prompt tells the agent to start from the current design, change only what was asked and keep the ids of texts it keeps
- [x] The merge clears device overrides only for keys the agent changed, through `clearOverridesFor`, and keeps the rest (tested)
- [x] Assistant replies join the conversation, with "Done." when a reply has no text, and the log scrolls to the latest message
- [x] Checked in the running app: a follow-up message changes one thing and leaves the rest
- [x] `lint`, `check-types` and `test` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
