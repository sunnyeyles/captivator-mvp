# 01: Import a website's name into three branded designs

**What to build:** A customer types their website address into a new "Website branding" sidebar section and presses Generate designs. The server reads that one public page safely and finds the business name. A chooser then shows Minimal, Event and Corporate greeting guests by that name, and each design can be previewed on desktop, tablet and mobile. Use this design loads the chosen one into the editor as one undo step, with a warning first when the current design has edits. From then on, switching template and Reset keep the branding. Every failure shows its customer-facing message and leaves the design untouched. This is the tracer bullet through every layer: safe server fetch, import route, brand profile, `brandedConfig`, store and UI. Logo, colours and image come in ticket 02. See `../spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

**Coordination:** this ticket and smart-crop 01 both change the editor store. They have no logical dependency, so if they run in parallel, expect a merge.

- [x] A server-only safe-fetch module only allows http and https on ports 80 and 443 with no credentials. It resolves every address and refuses loopback, private, CGNAT, link-local and metadata, multicast and reserved ranges, including their IPv6 and IPv4-mapped forms and IP literals. It follows at most 3 manual redirects and re-checks each one, and enforces a per-request timeout, a body size cap and content-type checks, with `fetch` and DNS lookup injected (tested)
- [x] `importBrand(url, deps)` normalises the URL, fetches the page (8-second timeout, HTML only, 1 MB cap, 15-second overall budget), and extracts the name by the precedence in the spec. That runs through the title cleanup, with the hostname as the last fallback, and records `"name"` as missing when the fallback is used. The manifest is fetched only when the page links one and the name is still missing (tested)
- [x] `POST /api/brand-import` returns `{ brand }` or `{ error: { code, message } }` with the status codes in the spec. Output is parsed with `brandProfileSchema`, responses carry `Cache-Control: no-store`, and messages never contain internal details (tested through the handler's `POST`)
- [x] `brandProfileSchema` and `BrandProfile` are exported from `@repo/portal` with the full shape in the spec. Fields this ticket doesn't fill are `null` or empty and listed in `missing`
- [x] `brandedConfig(templateId, brand)` returns the template unchanged for `null` and applies the heading text rules otherwise. Names over 24 characters step the heading size down with a mobile override. The output parses against `portalConfigSchema` and renders on every device, and template overrides survive (tested)
- [x] The store adds `brand` to `HistoryEntry` and has `applyBrandedDesign` as one undo step. Undo and redo restore the brand. `setTemplate`, `reset` and `isAtTemplateDefaults` build from `brandedConfig(id, state.brand)`, and `brandDraft` never touches `config` or history. With no brand, existing behaviour is unchanged (tested)
- [x] The sidebar section has a URL input and a Generate designs button. The button shows a loading state, a new submit aborts the old request, Enter submits, and client-side checks catch empty or invalid URLs. Errors show in a `role="alert"` region
- [x] The shadcn Dialog chooser shows three inert `SplashPage` previews in published mode, with a local device toggle that leaves the editor's device mode alone. It has the edit warning and Use this design. Customer branding styles only the previews, and everything is keyboard-operable
- [x] Checked in the running app against a real site, an unreachable host and a private address
- [x] `lint`, `check-types`, `test` and `build` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
