# Website branding import

Status: ready-for-agent

## Problem Statement

A customer starting a splash page has to rebuild their own branding by hand: find their logo file, look up their brand colour, type their business name into each heading, and then do it again whenever they try a different template. Most customers already have all of this on their business website, but the editor gives them no way to use it, so the first few minutes in the editor are spent on data entry instead of design, and many settle for the template's placeholder logo and stock colours.

## Solution

The customer types their website address into the editor and presses **Generate designs**. The app reads the public home page once, picks out the business name, logo, brand colours and a suitable image, and shows the three existing templates (Minimal, Event and Corporate) already filled in with that branding. The customer can flip each one between desktop, tablet and mobile, try a different extracted brand colour and watch all three update instantly, then press **Use this design** on their favourite. That design loads into the existing editor as an ordinary portal config, so every part of it stays editable, and it can be undone in one step.

Whatever the site doesn't provide falls back to the template's own value, and the customer is told what wasn't found. Re-opening the designs, switching templates or trying another colour never re-reads the website. Nothing in the current design changes until the customer chooses a design.

The MVP reads the site's HTML directly from the Next.js server with no third-party extraction service and no generative AI. The extracted **brand profile** is the seam, so a richer extractor such as Firecrawl can replace the HTML reader later without touching the templates, the store or the UI.

## User Stories

1. As a customer, I want to enter my website address, so that my splash page starts with my own branding instead of placeholders.
2. As a customer, I want to type my address without `https://`, so that I don't have to know URL syntax.
3. As a customer, I want a clear message when what I typed isn't a website address, so that I can fix it before anything runs.
4. As a customer, I want to see that the designs are being generated, so that I know the app is working while it reads my site.
5. As a customer, I want generation to finish within a few seconds or tell me it couldn't, so that I'm never left waiting indefinitely.
6. As a customer, I want my business name picked up from my site, so that headings greet guests by my business name.
7. As a customer, I want my logo picked up from my site, so that I don't have to find and upload the file myself.
8. As a customer, I want my brand colour picked up from my site, so that backgrounds and the Connect button match my brand.
9. As a customer, I want an image from my site used for the image-led template, so that the Event design shows something of my business.
10. As a customer, I want to see all three templates filled in with my branding side by side, so that I can compare them before choosing.
11. As a customer, I want to preview each generated design on desktop, tablet and mobile, so that I know how guests will see it on their device.
12. As a customer, I want the previews drawn exactly as the editor and published page would draw them, so that what I choose is what I get.
13. As a customer, I want to pick a different brand colour from the colours found on my site, so that I can correct a wrong guess.
14. As a customer, I want to enter my own brand colour when the site's colours are wrong or missing, so that I'm not stuck with a bad match.
15. As a customer, I want all three previews to update immediately when I change the brand colour, so that I can compare quickly.
16. As a customer, I want to be told which details couldn't be found on my site, so that I know what to add myself.
17. As a customer, I want a design that still looks finished when my site has no logo, colour or image, so that missing details never produce a broken page.
18. As a customer, I want text on generated designs to stay readable against its background, so that guests can read it whatever my brand colour is.
19. As a customer, I want a long business name to still fit on a phone, so that the mobile design doesn't break.
20. As a customer, I want to choose one design and continue in the normal editor, so that I can fine-tune it.
21. As a customer, I want every part of the chosen design to be editable like any template, so that generated content never locks me in.
22. As a customer, I want my generated logo and image handled like uploaded ones, so that I can replace or remove them with the existing controls.
23. As a customer, I want to be warned before a generated design replaces edits I've already made, so that I don't lose work by accident.
24. As a customer, I want to undo applying a generated design in one step, so that I can get my previous design back.
25. As a customer, I want the designs I was shown to stay available after I close the chooser, so that I can reopen them without waiting again.
26. As a customer, I want switching templates after importing to keep my branding, so that trying another template doesn't throw my branding away.
27. As a customer, I want Reset to return to the branded version of my template, so that resetting doesn't strip out my logo and colours.
28. As a customer, I want the template thumbnails in the sidebar to show my branding once imported, so that the gallery reflects what I'd get.
29. As a customer, I want entering the same website again to reuse what was already found, so that I'm not kept waiting for the same result.
30. As a customer, I want an explicit way to re-read my website, so that I can pick up changes I've made to it.
31. As a customer, I want re-reading my website to leave my current design alone until I choose a design, so that a refresh can't overwrite my work.
32. As a customer, I want a clear message when my site can't be reached, blocks the request, or isn't a web page, so that I know to try again or brand the page by hand.
33. As a customer, I want existing device overrides from a template kept in its generated design, so that the generated mobile layout is as good as the template's.
34. As a customer, I want the import to require nothing more than my address, so that branding takes seconds.
35. As a customer, I want my brand to style only the splash page, so that the editor itself stays consistent and usable.
36. As a customer using a keyboard or screen reader, I want the address field, chooser, device toggle and colour choices to be fully operable and announced, so that I can use the feature without a mouse.
37. As an operator, I want the server to refuse to fetch private, loopback or cloud-metadata addresses, so that the import can't be used to probe our infrastructure.
38. As an operator, I want each import to make a small, fixed number of outbound requests with size and time limits, so that costs stay predictable and a hostile site can't tie up the server.
39. As an operator, I want no paid extraction API or AI model in the MVP, so that the feature adds no per-use cost or new vendor.
40. As an operator, I want imported images embedded in the config rather than hotlinked, so that a published page never depends on the customer's site staying up.
41. As a developer, I want generated designs to be ordinary portal configs validated by the existing schema, so that the renderer and editor need no special cases.
42. As a developer, I want the extraction behind a brand profile type, so that a better extractor can replace it later without touching templates or UI.

## Implementation Decisions

### Architecture and data flow

The feature adds one server step in front of the existing one-way flow:

```text
URL ─► POST /api/brand-import ─► brand profile ─┐
                                                 ▼
               (client) brandedConfig(templateId, brand) × 3 ─► SplashPage previews
                                                 │ Use this design
                                                 ▼
                     Zustand store ─► PortalConfig ─► renderer ─► device views
```

- The only network work is one call from the browser to the app's own route handler, which reads the customer's site. Everything after that, including all three designs, colour swaps and template switches, is computed in the browser from the brand profile.
- Generated designs are portal configs produced by one pure function from a template and a brand profile. There is no separate page implementation per design, and the renderer is unchanged.
- The renderer still never imports the store or editor code.

### Module: brand profile and branded configs (`packages/portal`)

These sit beside the templates they fill in, since a branded design is a template preset plus branding.

- **Brand profile schema.** A Zod schema and its inferred `BrandProfile` type. This is what the import returns and what the store keeps. Shape (type sketch, not final code):

  ```ts
  const brandProfileSchema = z.object({
    sourceUrl: z.url(), // final page URL after redirects
    name: z.string().trim().min(1).max(60),
    logo: z.string().nullable(), // data URL
    image: z.string().nullable(), // data URL, raster only
    imageRecommended: recommendedPositionsSchema.nullable(), // from smart-crop, filled in the browser
    colors: z.array(colorSchema).max(6), // candidates, most likely first
    primaryColor: colorSchema.nullable(), // the colour designs are built from
    missing: z.array(z.enum(["name", "logo", "image", "colors"])),
  });
  ```

  `primaryColor` defaults to the first candidate that isn't near-white or near-black, and the customer can change it. `missing` lists what the site didn't provide. `name` is always present because it falls back to the hostname, and in that case `"name"` is listed as missing.

- **`brandedConfig(templateId, brand: BrandProfile | null): PortalConfig`.** This is pure. With `null` it returns the template's config unchanged, which keeps today's behaviour. Otherwise it starts from the template's config, preserves the template's device overrides, and applies the rules below. It is written directly as one function with a case per template, not as a configurable rules engine.

  |              | Minimal                                     | Event                                                                             | Corporate                                                                                                      |
  | ------------ | ------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
  | Heading text | "Welcome to {name}"                         | Event title becomes {name}                                                        | "Welcome to {name}"                                                                                            |
  | Other text   | Kept                                        | Kept                                                                              | Kept                                                                                                           |
  | Logo         | Brand logo, or none                         | Brand logo, or none                                                               | Brand logo, or none                                                                                            |
  | Background   | Solid primary colour                        | Brand image, or the template image, with the primary colour as the fill behind it | Template's light background kept                                                                               |
  | Text colour  | Readable on primary                         | Kept (sits on the overlay)                                                        | Heading uses primary when its contrast against the background is at least 4.5:1, otherwise the template colour |
  | Button       | Readable-on-primary fill with primary label | Primary fill with readable label                                                  | Primary fill with readable label                                                                               |
  - With no primary colour, all colours stay as the template's.
  - With no logo, `branding.logo` is `null` rather than the generic placeholder, because a placeholder looks like a broken import on a branded page. The logo alt text is "{name} logo", and the template's logo sizing and overrides are kept.
  - Names longer than 24 characters step the heading font size down, with a matching mobile override, so a 60-character name wraps to at most three lines on the mobile frame. The exact sizes are chosen during implementation and pinned by tests.
  - The output must parse against `portalConfigSchema` for every template and every valid brand profile. Tests enforce this, and the function doesn't validate at runtime.

- **Contrast helper.** The existing contrast module gains a WCAG contrast-ratio function next to `readableTextColor`, used by `brandedConfig` for the button and heading checks above.

- **No schema change to `PortalConfig` beyond smart-crop's.** Imported images go into the existing logo and background `src` strings as data URLs, which `imageSrcSchema` already allows and the renderer already draws (the templates use SVG data URIs today).

- **Alignment with smart-crop** (`.scratch/smart-crop/spec.md`). The Event design's background image uses smart-crop's numeric position shape: centred shared `position`, `recommended` taken from `imageRecommended`, no overrides, and fit and overlay kept from the template. The server always returns `imageRecommended: null`. After a successful import, the browser converts the image data URL to a Blob and runs smart-crop's standalone analysis step, with its 2-second timeout and centred fallback, then sets the result on the draft brand before the chooser shows the designs. The image stays a data URL rather than an object URL, because the draft brand lives outside undo history and the object-URL sweep would revoke a URL the chooser still shows. Once a design is applied, the customer can reposition the imported background with smart-crop's Reposition mode, like any other background image.

### Module: brand import (server-only, `apps/web`)

This is one module that does all the work, behind a function such as `importBrand(url, deps)`. The route handler is a thin wrapper around it. `deps` injects `fetch` and DNS lookup so tests never touch the network.

**Steps:**

1. **Normalise the input.** Trim it, add `https://` when there is no scheme, and parse it with `URL`. Only `http:` and `https:`, ports 80 and 443, no credentials, at most 2048 characters.
2. **Guard against SSRF.** Resolve every address for the host with `node:dns/promises`. Reject the request if any address is in a blocked range, checked with `node:net` `BlockList`:
   - loopback, `0.0.0.0/8`, the private ranges `10/8`, `172.16/12` and `192.168/16`, CGNAT `100.64/10`, link-local `169.254/16` (cloud metadata), multicast and reserved
   - the IPv6 equivalents `::1`, `fc00::/7` and `fe80::/10`, plus IPv4-mapped forms of all the above

   IP-literal hosts get the same check. Redirects are followed manually (`redirect: "manual"`), at most 3 hops, and each hop is checked again.

3. **Fetch the page.** One `GET` with a fixed user agent, `Accept: text/html`, no cookies and an 8-second timeout. Reject anything that isn't `text/html`, and read at most 1 MB of the body.
4. **Extract.** A small tag scanner over the HTML, written in place with no parser dependency, reads `<title>`, `<meta>`, `<link>` and `<img>` tags and JSON-LD script blocks. Candidates are tried in this order:
   - **Name:** `og:site_name`, then `application-name`, then JSON-LD Organization `name`, then the web manifest's `name` or `short_name`, then the `<title>` split on `| – — · :` with generic segments like "Home" and "Welcome" dropped, then the hostname without `www.` and the TLD, title-cased.
   - **Logo:** JSON-LD Organization `logo`, then the first `<img>` whose `src`, `alt`, `class` or `id` contains "logo", then `apple-touch-icon`, then the largest PNG or SVG `rel=icon`, then the largest manifest icon.
   - **Image:** `og:image`, then `twitter:image`.
   - **Colours:** `theme-color` (light-scheme variant first), then the manifest's `theme_color` and `background_color`, then `msapplication-TileColor`, then the `mask-icon` `color`. Each is normalised to lowercase `#rrggbb`, any alpha is dropped, and anything that isn't hex, such as named or `rgb()` colours, is skipped. Duplicates are removed.
   - Relative URLs resolve against the final page URL.
   - The web manifest is fetched only when the page links one and the name or colours are still missing.
5. **Fetch the assets.**
   - **Logo:** try at most 2 candidates, stopping at the first success.
   - **Image:** try 1 candidate.
   - Every asset fetch goes through the same SSRF guard, timeout and redirect rules.
   - Accepted types: the existing `imageTypes`, plus `image/svg+xml` for logos only. SVG is safe here because the renderer only draws logos through `<img>`, where scripts don't run.
   - The size limit is the existing `IMAGE_MAX_BYTES`. The content type is checked against the file's magic bytes, not just the response header.
   - Successful assets come back as base64 data URLs.
6. **Return** a profile that parses against `brandProfileSchema`. A failed logo, image or manifest fetch is never an error. It just lands in `missing`.

The most outbound requests an import can make is 5: one page, one manifest, two logo attempts and one image. The whole import has a 15-second budget.

### API contract

`POST /api/brand-import` is a Next.js route handler on the Node.js runtime and is not cached. Responses carry `Cache-Control: no-store`.

- **Request:** `{ "url": string }`, validated with Zod.
- **200:** `{ "brand": BrandProfile }`. A partial profile is still a 200.
- **Error:** `{ "error": { "code", "message" } }`, where `message` is customer-facing copy:

  | Status | Code          | When                                                             |
  | ------ | ------------- | ---------------------------------------------------------------- |
  | 400    | `invalid_url` | The input isn't a usable http(s) URL                             |
  | 422    | `blocked_url` | The host resolves to a blocked address or uses a disallowed port |
  | 502    | `unreachable` | DNS failure, connection failure, or a 4xx/5xx from the site      |
  | 502    | `not_html`    | The final response isn't an HTML page                            |
  | 504    | `timeout`     | The page fetch or the overall budget ran out                     |

- Error messages never echo resolved IPs or internal details.

### Store changes (`apps/web` editor store)

- **The applied brand joins history.** `HistoryEntry` gains `brand: BrandProfile | null`, which starts as `null`. Undo and redo therefore restore the brand together with the config and template it produced.
- **`applyBrandedDesign(templateId, brand)`.** Sets `config` to `brandedConfig(templateId, brand)` and sets `templateId` and `brand`, all as one undo step. Selection is kept when the element still exists, using the same rule as `setTemplate`.
- **`setTemplate` and `reset` build from `brandedConfig(id, state.brand)`.** Once a brand is applied, switching template or resetting keeps it. `isAtTemplateDefaults` compares against the same branded base.
- **A non-history draft.** A `brandDraft: BrandProfile | null` field outside history holds the latest import result and the customer's colour choice while they use the chooser. It is set by a successful import and by colour changes, and it is seeded from `brand` when the chooser is reopened without a new import. It never affects `config`.
- **Image cleanup is unchanged.** Imported images are data URLs, not `blob:` URLs, so the existing object-URL cleanup ignores them.

### UI behaviour (`apps/web`, shadcn/ui and editor theme tokens only)

**Website branding section.** A new sidebar section, "Website branding", sits above Templates and holds:

- A URL input (`type="url"`, `inputMode="url"`, placeholder `yourbusiness.com`) and a **Generate designs** button. Enter submits.
- While a request is in flight, the button is disabled and shows a spinner with "Generating…". A new submit aborts the previous one with an `AbortController`.
- Errors appear under the input in a `role="alert"` region, using the server's `message` for server errors. Client-side checks catch an empty value or an obviously invalid one before any request.
- After a successful import, the section also shows the source host, a **View designs** button that opens the chooser with no request, and a **Refresh from website** button that re-imports even for the same URL.
- Submitting a URL whose normalised form matches the current draft's or applied brand's `sourceUrl` opens the chooser without a request.

**Generated designs chooser.** This is a shadcn Dialog, added through the shadcn CLI and already within the spec's stack. It contains:

- **A device toggle.** Desktop, Tablet and Mobile, using the existing toggle group. It is local to the chooser and doesn't change the editor's device mode.
- **Three cards** (Minimal, Event and Corporate). Each renders `SplashPage` in `published` mode from `brandedConfig(id, brandDraft)`, scaled to fit, and is inert like the gallery thumbnails. Each card has a **Use this design** button.
- **A brand colour row.** Swatches for each candidate colour, with the selected one marked and `aria-pressed`, plus the existing colour field for a custom hex. Changing the colour updates `brandDraft.primaryColor`, and all three previews re-render immediately with no network request.
- **A missing-details note** naming what wasn't found, for example: "We couldn't find a logo on this site. You can upload one after choosing a design."
- **An edit warning.** When the current design differs from its base (`isAtTemplateDefaults` is false), an inline note reads: "Using a design replaces your current edits. You can undo this."
- **Choosing a design** calls `applyBrandedDesign`, closes the dialog and leaves the editor in its current device and canvas mode.

**Gallery and picker.** The template gallery thumbnails render `brandedConfig(id, brand)` instead of the raw template config, so they show the applied branding. The toolbar template picker needs no change because it only lists names.

Customer branding styles only the splash page previews, never the dialog or the sidebar chrome.

### Validation

- **URL:** checked with a Zod schema on the client for fast feedback, and checked again authoritatively on the server.
- **Server output:** the import's output is parsed with `brandProfileSchema` before it's returned, so a parsing bug becomes a 502 `unreachable` rather than bad data.
- **Client response:** the client parses the response with the same schema before using it.
- **Custom brand colour:** goes through `colorSchema`, using the existing validated-field pattern.
- **Generated configs:** guaranteed valid by tests, not by runtime checks.

### Error handling

- **Site-level failures** are shown as messages next to the input, and the current design is never touched. These are unreachable, timeout, not HTML and blocked.
- **Partial results** are successes. Missing items are listed in the chooser and fall back per field.
- **A malformed client response** shows a generic "Something went wrong reading that site. Try again." message.
- **Aborted requests** fail silently.

### Persistence

- **The brand lives in memory.** The applied brand lives in the editor store with the design, and the draft lives beside it. Both last for the editor session, like the rest of the design today. The MVP has no database, no asset bucket and no server cache.
- **Imported images are embedded.** Logos and images become data URLs inside the config, which makes a design self-contained and ready for the later local or Supabase persistence in the MVP spec (§15–16) with no hotlinking.

### Security

- **SSRF guard.** Blocked address ranges, re-checked on every redirect, ports 80 and 443 only, no credentials, and manual redirects capped at 3.
- **Accepted residual risk:** DNS rebinding between the lookup and the connect. A later hardening step can pin the connection to the checked address.
- **Response limits.** Every outbound request has a size cap, a timeout and a content-type check confirmed by magic bytes.
- **Untrusted content.** Extracted text is treated as untrusted data. It's only ever rendered as React text, never as HTML.
- **SVG logos** are only drawn through `<img>` and never inlined.
- **No secrets** are needed.
- **No rate limiting** in the MVP. This is a known gap: per-instance memory limits are ineffective on serverless hosting, and real limiting arrives with authentication.

### Performance and cost

- **One import, three designs.** One browser-to-server request per import and at most 5 outbound fetches. The three designs are pure client-side computation.
- **No extra fetches.** Regenerating, swapping colours, switching templates and reopening the chooser cost no network requests.
- **Bounded payload.** The largest response is two data-URL images within `IMAGE_MAX_BYTES` each.
- **No new infrastructure, dependencies, paid APIs or AI.**

## Implementation Phases

Each phase is a vertical slice that is shippable on its own. The tickets live in `issues/` and are sequenced with `.scratch/smart-crop/issues/`.

1. **Name into three designs (tracer bullet).** The safe server fetch and the import route, with name extraction only. Then the brand profile, `brandedConfig` text rules, the store's brand history and draft, and the sidebar section and chooser with Use this design.
2. **Full branding and regeneration.** Logo, colours (with the contrast rules and colour swap) and the Event image in the new position shape. Also reuse without re-reading, Refresh from website, and branded gallery thumbnails. Blocked by smart-crop 01.
3. **Automatic positions for the imported image.** Runs smart-crop's analysis on the imported image. Blocked by smart-crop 02.

## Acceptance Criteria

- [ ] Entering a reachable website address and pressing Generate designs shows Minimal, Event and Corporate filled in with that site's name, logo, colour and image wherever the site provides them.
- [ ] Each generated design previews on desktop, tablet and mobile through the shared `SplashPage` renderer.
- [ ] Every generated design is a `PortalConfig` that parses against `portalConfigSchema` and keeps its template's device overrides.
- [ ] Choosing a design loads it into the editor, where every element is editable with the existing controls.
- [ ] Applying a design is a single undo step, and undo restores the previous design and brand.
- [ ] The chooser warns before replacing a design that has edits, and the current design changes only when the customer picks one.
- [ ] Switching templates and Reset keep the applied branding, and the gallery thumbnails show it.
- [ ] Changing the brand colour, reopening the chooser or re-entering the same URL makes no network request. Only Refresh from website re-reads the site.
- [ ] A site with no logo, colours or image still produces three valid, readable designs, and the chooser says what was missing.
- [ ] Button labels on generated designs meet a 4.5:1 contrast ratio against the button fill.
- [ ] Addresses resolving to loopback, private, link-local or metadata ranges are refused, including via redirects, with `blocked_url`.
- [ ] Unreachable sites, non-HTML responses and timeouts each show the customer-facing message for their error code.
- [ ] An import makes at most 5 outbound requests, and each respects its size and time limits.
- [ ] No Firecrawl, AI model or new runtime dependency is added. The shadcn Dialog component is the only addition.
- [ ] `lint`, `check-types` and `test` pass for `@repo/portal` and `web`.

## Testing Decisions

A good test here drives a module through its public interface with realistic inputs and asserts on observable output, such as a rendered config, a returned profile, an HTTP-shaped error or store state. Tests never assert on private helpers or call order. The plan has three seams, each the highest point at which its behaviour can be exercised without a browser or network:

1. **`brandedConfig`** (`@repo/portal`). Run each template against a set of brand fixtures: a full profile, `null`, no colours, a near-white primary, a near-black primary, a 60-character name, an SVG logo, and no logo or image. For each, assert:
   - the output parses against `portalConfigSchema`
   - it renders its texts, fields and button on every device
   - fields missing from the brand keep the template's values
   - the template's overrides survive
   - the button label contrast is at least 4.5:1
   - the long-name heading steps down

   Prior art: `templates.test.tsx` (schema parsing plus `renderToStaticMarkup` per device) and `contrast.test.ts`.

2. **`importBrand(url, deps)`** (`apps/web`, server module). Drive it with a fake `fetch` that serves fixture HTML, manifests and image bytes, and a fake DNS lookup. This one seam covers extraction precedence and asset handling as well as safety:
   - **Extraction:** name, logo, image and colour precedence; relative URL resolution; title cleanup; the hostname fallback; colour normalisation; and the `missing` list.
   - **Assets:** SVG accepted for the logo only, the logo-attempt limit, magic-byte mismatches rejected, and oversized bodies cut off.
   - **Safety:** blocked IPs and ports, redirects into private ranges, the redirect cap, timeouts, non-HTML responses, and the outbound request count.

   The route handler stays thin enough that a single test calling its `POST` with a `Request` checks the status codes and envelope. Prior art: `images.test.ts` (injected `revoke`) for dependency injection, and `selected-element.test.ts` for pure-function style.

3. **Editor store.** Cover:
   - `applyBrandedDesign` sets the config, template and brand as one undo step
   - undo and redo restore the brand
   - `setTemplate` and `reset` use the applied brand
   - `isAtTemplateDefaults` compares against the branded base
   - `brandDraft` changes never touch `config` or history

   Prior art: `editor-store.test.ts`.

The sidebar section and chooser get no unit tests, in line with the existing editor components. They are checked by running the app.

## Out of Scope

- **Firecrawl or any third-party scraping or extraction API.** The brand profile is the seam for adding one later.
- **Generative AI** for copy, layout or colour choices.
- **Typography.** `PortalConfig` has no font family, and loading arbitrary web fonts into the portal needs its own schema, licensing and loading decisions.
- **Deriving colours from logo or image pixels** when the site declares none. This is a likely first follow-up, done on the client by sampling the embedded data URL in a canvas.
- **Picking between several logo or image candidates in the UI.** Customers replace either with the existing upload controls.
- **Image resizing, cropping or format conversion.** ICO favicons.
- **Crawling beyond the single submitted page,** and JavaScript-rendered sites whose branding only appears after client-side rendering.
- **Persistence:** server-side caching of imports, a database, asset storage, rate limiting and authentication.
- **New templates, or changes to the three templates' layouts.**

## Further Notes

- `docs/MVP_SPEC.md` §15 lists "Website Branding Import" as an optional enhancement. This spec implements it without the §16 infrastructure.
- Many small-business sites declare no `theme-color` or manifest, so expect `colors` to be empty fairly often. The designs then keep template colours with the customer's name, logo and image, and the colour row invites a custom colour. That gap is why pixel-sampled colours are the first follow-up.
- `og:image` is often a social card with text baked in. That's acceptable for the MVP because the Event overlay keeps text readable and the customer can replace the image.
- The repo has no `GLOSSARY.md` yet. Two new terms are introduced: **brand profile** (what an import extracts) and **branded design** (a template config with a brand profile applied). They are worth adding through `/domain-modeling` when the glossary is created.
