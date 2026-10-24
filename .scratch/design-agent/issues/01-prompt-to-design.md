# 01: Design a page from a prompt

**What to build:** A customer describes their event in a chat panel beside the canvas, or clicks one of six example prompts for Popup WiFi events, and the assistant designs the page: headings and copy, background colour, guest fields and the Connect button. A short summary of what changed appears in the chat, and the new design lands as one undo step. The agent runs on the Vercel AI Gateway through the AI SDK, on a cheap default model that `AI_MODEL` can change. Every value it returns goes through the portal schema, so a bad reply can never produce an invalid config. See `../spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `generatedDesignSchema`, `designReplySchema` (design before reply) and `designRequestSchema` (1 to 20 messages of up to 1000 characters, the current design and `hasBackgroundImage`) live in `apps/web/lib/design-agent.ts`, with loose types and described limits so every gateway model accepts them
- [x] `mergeGeneratedDesign` checks each value against its portal schema field and keeps the current value when it's missing or invalid. Texts merge by id, fields by type with repeats dropped and at most `MAX_GUEST_FIELDS`, empty labels use the field type's default, logo and background image are kept, an image background needs an existing image, and a result that fails `portalConfigSchema` returns the base (tested)
- [x] `designAgentModel()` returns `AI_MODEL` or `google/gemini-3.1-flash-lite`, in its own module so tests can swap in a mock model
- [x] `POST /api/design-agent` streams `designReplySchema` with `streamText` and `Output.object`, answers 400 for a body that doesn't parse and 503 "The design assistant isn't set up yet." without `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`, all `no-store` (tested with `MockLanguageModelV4`)
- [x] The system prompt sets the Popup WiFi context and the rules in the spec: short Australian English copy, at most 3 texts, readable contrast, size ranges, at most 2 fields, a short button label, and saying so when asked for what the page can't do
- [x] The `DesignAssistant` panel, built from shadcn `Button` and `Textarea`, shows an empty state with the example prompts, the conversation as a polite live log, and Enter to send with Shift+Enter for a new line
- [x] `finishGeneration(config)` lands the finished reply as one undo step, and a reply that changes nothing adds no step (tested)
- [x] `ai` and `@ai-sdk/react` are added to `web`, `guestFieldSchema` is exported from `@repo/portal`, and `turbo.json` passes the three AI env vars to `dev` and `build`
- [x] Checked in the running app with a mocked route response: an example prompt redesigns the page and undo restores it
- [x] `lint`, `check-types` and `test` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
