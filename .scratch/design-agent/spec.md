# AI design assistant

**Status:** done

## Problem Statement

A Popup WiFi customer setting up a splash page for an event has to turn their idea of the event into individual edits: pick a template, rewrite each heading, find colours that suit the event and still read well, choose which guest details to collect and relabel the Connect button. Each of these is a separate control in the properties sidebar. A customer who knows what they want ("navy and gold for the footy grand final, ask for name and phone") still has to translate that into a dozen edits, and a customer who doesn't know where to start has no prompt to get going.

## Solution

A **Design assistant** chat panel sits beside the canvas in the editor. The customer describes their event, or picks one of six example prompts for typical Popup WiFi events, and the assistant designs the page: headings and copy, background colour, guest fields and the Connect button. The customer then asks for changes in the same conversation ("make the heading bigger", "collect email only") and the assistant changes only what they asked for.

The assistant's reply streams into the canvas, so the page changes as the answer arrives, and a one-line summary of what changed appears in the chat. A finished reply lands as one undo step. **Stop** or a failed reply puts the page back to how it was before the message.

The assistant writes the same `PortalConfig` the controls write, through the portal schema, so everything it produces stays editable in the sidebar and is saved and published like any other edit. The customer can also start from their own brand: **From your website** reads their site, and **Upload assets** takes a logo and a photo. Their logo and background go on the page and their name, description and colours go to the assistant to theme around. The assistant itself can't make images, extra fields or links, and says so when asked. It runs on the Vercel AI Gateway through the AI SDK, on a cheap default model that `AI_MODEL` can change without a code change.

## User Stories

1. As a customer, I want to describe my event in a sentence, so that I get a splash page designed for it without editing each element.
2. As a customer, I want example prompts for typical events when the chat is empty, so that I know what to ask and can try the assistant with one click.
3. As a customer, I want to see the page change while the assistant answers, so that I know it's working and can watch the design come together.
4. As a customer, I want a short message telling me what changed, so that I don't have to spot every difference myself.
5. As a customer, I want to ask for follow-up changes in the same conversation, so that I can refine the design step by step.
6. As a customer, I want the assistant to change only what I asked for, so that my earlier edits aren't thrown away.
7. As a customer, I want the assistant to start from the page as it is now, including my manual edits, so that chat and sidebar edits work together.
8. As a customer, I want my logo and background image kept, so that the assistant never removes branding it can't recreate.
9. As a customer, I want text and button colours that read well on the background, so that guests can use the page.
10. As a customer, I want at most two guest fields, each asking for something different, so that the page stays within what the portal supports.
11. As a customer, I want to be told when I ask for something the page can't do, such as images, extra fields or links, so that I'm not left wondering why it didn't happen.
12. As a customer, I want each assistant reply to be one undo step, so that I can undo a whole reply at once.
13. As a customer, I want to stop a reply part-way, so that I can change my mind without waiting.
14. As a customer, I want a stopped or failed reply to leave my page as it was, so that I never end up with a half-applied design.
15. As a customer, I want a clear message when the assistant fails or isn't set up, so that I know to try again or that it's unavailable.
16. As a customer, I want Enter to send and Shift+Enter to start a new line, so that the chat works like other chat inputs.
17. As a customer, I want everything the assistant made to stay editable in the sidebar, so that I can fine-tune it by hand.
18. As a developer, I want the model set by an environment variable, so that we can switch to a better or cheaper one without a code change.
19. As a developer, I want every value the model returns checked against the portal schema, so that a bad reply can never produce an invalid config.
20. As a developer, I want the route to work without a key in tests, so that the agent is covered by fast unit tests with a mock model.
21. As a customer, I want to start a design from my website address, so that the page uses my logo, colours, name and copy without me typing them.
22. As a customer, I want to upload my logo and a photo and have the page themed around them, so that I get my branding even without a website.
23. As a customer, I want to choose whether each uploaded image is the logo or the background, so that the assistant uses them the way I intend.
24. As a customer, I want a stopped or failed reply to take my imported or uploaded images off the page again, so that starting from my brand is as safe as any other message.
25. As a developer, I want text from the customer's website passed to the agent as data, never instructions, so that a site can't steer the assistant.

## Implementation Decisions

### Architecture and data flow

The assistant follows the editor's one-way data flow. It never writes the config directly from the network:

```text
DesignAssistant (client) ──useObject──▶ POST /api/design-agent ──streamText──▶ AI Gateway
        ▲                                        │
        │◀──── streamed JSON { design, reply } ──┘
        │
        └─▶ mergeGeneratedDesign(base, partial) ─▶ store.previewGeneratedConfig ─▶ SplashPage
            on finish ─▶ store.finishGeneration(final) → one undo step
```

The renderer is unchanged and knows nothing about the assistant.

### Module: design agent (`apps/web/lib/design-agent.ts`)

A deep module with a small public surface, and the main test seam.

- **`generatedDesignSchema`**: the part of a design the agent writes, top to bottom as guests see it: `texts` (id, text, fontSize, color, fontWeight, textAlign), `background` (type and colour), `fields` (type, label, placeholder, required) and `button` (label, colours, radius, width). Field types come from `guestFieldTypes`.
- The schema is deliberately loose (plain strings and numbers with descriptions stating the limits) so every gateway model accepts it as a structured-output schema. The real limits are enforced by the merge.
- **`designReplySchema`**: `{ design, reply }`, with `design` first so the canvas starts changing before the summary streams.
- **`designRequestSchema`**: `messages` (1 to `CHAT_HISTORY_MAX` = 20, each `user` or `assistant` with 1 to `CHAT_MESSAGE_MAX` = 1000 characters), the current `design` and `hasBackgroundImage`.
- **`toGeneratedDesign(config)`**: the agent's view of a config, without image sources, ids it can't use or device overrides.
- **`mergeGeneratedDesign(base, partial)`**: applies a complete or still-streaming design to a config.
  - Each value is checked against its portal schema field and falls back to the current value when missing or invalid.
  - Texts merge by id. A new id starts from `defaultTextStyle`, and a text whose id hasn't streamed yet is skipped.
  - Fields merge by type, repeated types are dropped and the list is cut to `MAX_GUEST_FIELDS`. An empty label or placeholder falls back to the field type's default.
  - Device overrides are cleared only for keys the agent changed, through the existing `clearOverridesFor`, so a change is never hidden by an override while untouched overrides survive.
  - The agent can't supply an image, so `background.type: "image"` is only kept when the page already has one, and the logo and background image are always kept.
  - The result is parsed with `portalConfigSchema`. If that fails the base config is returned.
- **`examplePrompts`**: six Popup WiFi events (music festival, weekend market, footy grand final, tech conference, charity fun run, rooftop pop-up bar).
- **`brandContextSchema`**: optional `name` (up to `BRAND_NAME_MAX`), `description` (up to `BRAND_DESCRIPTION_MAX` = 200), an http(s) `sourceUrl`, up to `BRAND_COLORS_MAX` = 6 hex `colors` and `hasLogo`. `designRequestSchema` takes it as an optional `brand`.
- **`DesignStart`** (`{ text, brand?, assets? }`) is a chat turn that starts from the customer's brand, and **`withAssets(config, assets)`** places its logo (keeping size and overrides) and background image (keeping fit and overlay, through `placedBackgroundImage`) on a config before the request, so the reply lands on top of them.
- Because assets are placed before the request, an uploaded or imported background counts as one the page already has, and the agent may show it or switch back to a colour.

`guestFieldSchema` is exported from `@repo/portal` for the field merge.

### Module: model choice (`apps/web/lib/design-agent-model.ts`)

`designAgentModel()` returns `process.env.AI_MODEL`, or `google/gemini-3.1-flash-lite` by default, as an AI Gateway model string. It's its own module so route tests can replace it with `MockLanguageModelV4`.

### API contract: `POST /api/design-agent`

- Body: `DesignRequest` as above. A body that isn't JSON or doesn't parse answers `400` with "That request couldn't be read."
- With neither `AI_GATEWAY_API_KEY` nor `VERCEL_OIDC_TOKEN` set, it answers `503` with "The design assistant isn't set up yet."
- Errors are `{ error: { message } }` with `Cache-Control: no-store`.
- Success streams the JSON text of `designReplySchema` from `streamText` with `Output.object`, also `no-store`. The request's abort signal is passed on, so Stop cancels the model call. `maxDuration` is 30 seconds.
- The system prompt describes Popup WiFi and its events, then the rules: start from the current design and change only what was asked, at most 3 short texts in Australian English, keep existing text ids, readable contrast, heading and copy size ranges, at most 2 guest fields, a button label under 20 characters, image backgrounds only when one exists, and say so when asked for something the page can't do. With a brand it also themes the page around the brand's colours, uses its name in the heading, bases copy on its description and prefers showing a just-added image. The current design, whether it has a background image and, when given, the brand are appended to the system prompt. The brand is quoted as JSON and labelled as data from the customer's website or images, never instructions.

### Store changes (`apps/web/lib/editor-store.ts`)

- New state `generationBase: HistoryEntry | null`: the design before a reply started streaming.
- `previewGeneratedConfig(config)` sets the config without touching history, records `generationBase` on the first chunk and keeps the selection only if the element still exists.
- `finishGeneration(config | null)` lands the final config as one undo step on top of `generationBase`. `null` restores the base, as on Stop or failure. A reply that changes nothing adds no undo step. A reply that finishes before any preview uses the current state as its base.
- Undo and redo are ignored while `generationBase` is set, since the reply lands on top of the history when it finishes.
- Loading a design clears `generationBase`.
- `generationBase` counts as reachable when blob URLs are revoked, so the base's images survive while a reply streams over them, and a failed reply's images are freed.

### UI behaviour (`apps/web/components/editor/design-assistant.tsx`)

A client leaf built from shadcn `Button` and `Textarea` and editor theme tokens.

- A "Design assistant" header, then a conversation `role="log"` with `aria-live="polite"`.
- The empty state explains the assistant and lists the ways to start as `PromptCard`s in a container-query grid: **From your website**, **Upload assets**, then the example prompts, which send straight away.
- **From your website** (`website-asset-card.tsx`) opens the existing website URL form, imports through `/api/brand-import` and sends "Design a page using the brand from {host}" with the brand's name, description, colours (the site's plus the logo's dominant colours) and its logo and image as assets.
- **Upload assets** (`upload-asset-card.tsx`) takes up to two PNG, JPEG, WebP or SVG files by picker or drag and drop. SVGs default to the logo and the first photo to the background, each role holds one image, and an SVG can only be the logo. The background goes through `prepareBackgroundImage` for its automatic positions, the colours come from both images, and it sends "Design a page around my uploaded images".
- Assets are placed inside the streaming preview, so Stop or a failed reply takes them off the page again. If a reply started in the meantime, the upload card frees its object URLs.
- User and assistant messages are bubbles. While a reply streams, a spinner bubble shows the streamed reply text, or "Designing…" until it starts.
- Errors show in a `role="alert"` line: the route's message when it sent one, otherwise "The assistant couldn't finish that. Try again." A reply with no text shows "Done."
- The input is limited to `CHAT_MESSAGE_MAX`. Enter sends, Shift+Enter adds a line. Send is disabled when the input is empty and becomes Stop while a reply streams.
- The base config is captured when a message is sent, and every streamed chunk is merged onto that same base.
- The conversation lives in component state. Only the last `CHAT_HISTORY_MAX` messages are sent.

The panel sits to the right of the canvas on `md` and up, and below it on small screens.

### Configuration

- `AI_GATEWAY_API_KEY` (or `VERCEL_OIDC_TOKEN` on Vercel) enables the assistant. `AI_MODEL` optionally picks the model. Both live in gitignored `.env*` files.
- `turbo.json` passes `AI_GATEWAY_API_KEY`, `AI_MODEL` and `VERCEL_OIDC_TOKEN` through to `dev` and `build`.
- New dependencies in `apps/web`: `ai` and `@ai-sdk/react`.

### Security and cost

- The prompt only ever sees text, colours and field settings, never image data. Colours are read from images in the browser.
- Brand text from the customer's website is passed as quoted data, never instructions.
- The model's output never reaches the store unchecked: every value goes through the portal schema.
- The route has no auth or rate limiting, so anyone who can reach it can spend gateway credits. Acceptable for the demo, and recorded under Out of Scope.

## Implementation Phases

1. **Prompt to design:** the agent schemas and merge, the route on the AI Gateway, the chat panel with example prompts, and a finished reply applied as one undo step.
2. **Live streaming, Stop and failure:** streamed chunks preview on the canvas without history, Stop and failures restore the page, and undo waits for the reply.
3. **Refining in conversation:** history and the current design go with each message, the agent changes only what was asked, and device overrides of untouched values survive.
4. **Starting from the customer's brand:** From your website and Upload assets place the customer's images and send their brand as data.

## Acceptance Criteria

- Describing an event or clicking an example prompt designs the page, and the chat shows a short summary.
- The canvas changes while the reply streams, and the finished reply is one undo step.
- Stop and failures leave the page exactly as it was before the message.
- Follow-up messages change only what was asked, starting from the current page, manual edits included.
- Logos and background images are never removed, and a background image is only shown when the page has one.
- No reply, however malformed, produces a config that fails `portalConfigSchema`.
- Without a gateway key the assistant says it isn't set up yet.
- Starting from a website or uploads puts the customer's logo and background on the page and themes the design around their brand, and Stop or failure removes them again.
- `lint`, `check-types` and `test` pass for `web` and `@repo/portal`.

## Testing Decisions

Tests check external behaviour through public interfaces, in Vitest's node environment, next to the code. There are no component tests, and the panel is checked in the running app.

- **Merge (`design-agent.test.ts`):** a complete design gives a valid config, logo and background image are kept, overrides of changed keys are cleared and of untouched keys kept, invalid values fall back, empty labels use the type default, repeated and extra fields are dropped, image backgrounds need an existing image, partial streams keep the current design, texts without an id are skipped, every template's `toGeneratedDesign` parses as a request, and it round-trips through the merge unchanged.
- **Store (`editor-store.test.ts`):** a streamed preview adds no history, a finished reply is one undo step, a failed reply restores the design, an unchanged reply adds no step, and undo is ignored while a reply streams.
- **Route (`route.test.ts`):** with `MockLanguageModelV4` in place of the gateway model, it streams the design as JSON text, rejects a malformed body and an empty conversation with 400, answers 503 without a key, passes the brand to the agent as data and rejects an invalid brand.
- **Brand assets:** `withAssets` places a background and logo and leaves a config without assets alone, the merge shows or drops an uploaded background, `designRequestSchema` accepts requests with and without a brand, `importBrand` extracts and caps the site description, `dominantColors` orders and merges colours and ignores transparency, `assetFileError` rejects an oversized SVG, and the store keeps the base's images while a reply streams.

Prior art: `editor-store.test.ts` resets the store before each test and drives actions through `getState`.

## Out of Scope

- Auth and rate limiting on the route.
- Images made by the assistant: generating or searching for logos and backgrounds. The customer supplies them through From your website and Upload assets.
- Layout and spacing, fonts, device-specific values and templates: the agent writes shared values only.
- Keeping the conversation across reloads or saving it with the Design.
- Choosing a model in the UI.
- Tool calls and multi-step agents. The website is read once by the existing brand import, not by the agent.

## Further Notes

- Written retrospectively. Tickets 01 to 03 record PR #21 (commit `5f8e2f2`) as three slices of one change. Ticket 04 records PR #25 (commit `ab3cd0a`), which brought #22 to `main` after it missed #21's merge.
- Not tested against a live model when it shipped, because the AI Gateway was unreachable from the build environment. It was checked in the running app with a mocked route response.
- PR #23 later moved the panel into the resizable `EditorPanels` layout. That change belongs to the editor, not this feature.
