# 02: Logo, colours, Event image and regeneration without re-reading

**What to build:** Generated designs now carry the customer's whole brand. That means their logo on all three templates, their brand colour on backgrounds and Connect buttons (kept readable by contrast rules), and an image from their site behind the Event design. The chooser names anything that wasn't found, and the design falls back to the template's value for it. The customer can try a different extracted colour or a custom hex, and all three previews update instantly with no request. Regenerating never re-reads the site: View designs, re-entering the same address, switching templates and colour swaps all reuse the profile, and only Refresh from website fetches again. Once a brand is applied, the template gallery thumbnails show it. See `../spec.md`.

**Blocked by:** 01, smart-crop 01

**Status:** done

**Coordination:** the Event background uses smart-crop's numeric position shape, centred with `recommended: null`. Automatic positions for the imported image are ticket 03.

- [x] The import finds the logo candidates in spec order and tries at most 2. It finds `og:image` or `twitter:image` and tries 1. Assets go through the safe fetch, are checked by magic bytes, and are capped at `IMAGE_MAX_BYTES`, with SVG allowed for logos only. They come back as data URLs, and failures land in `missing` (tested)
- [x] The import finds colour candidates in spec order and normalises them to lowercase `#rrggbb`, with duplicates removed. `primaryColor` is the first candidate that isn't near-white or near-black. The manifest is fetched only when it's needed, and no import makes more than 5 outbound requests (tested)
- [x] A WCAG contrast-ratio helper sits beside `readableTextColor` (tested)
- [x] `brandedConfig` applies the logo, background, text-colour and button rules in the spec's table. A missing logo gives `logo: null`, the logo alt text is "{name} logo", and with no colour the template's colours stay. The Event image keeps fit and overlay from the template, with a centred position, `recommended` from `imageRecommended`, and no overrides (tested)
- [x] Fixtures (full, no colours, near-white, near-black, SVG logo, and no logo or image) parse against `portalConfigSchema` for every template and render on every device. Button label contrast is at least 4.5:1, and Corporate's heading uses the primary colour only at 4.5:1 or more (tested)
- [x] The chooser's colour row shows candidate swatches with `aria-pressed` and the existing colour field for a custom hex. Changes update `brandDraft`, and all three previews re-render with no request. The missing-details note names what wasn't found
- [x] View designs and a same-URL submit open the chooser with no request, seeded from the draft or the applied brand. Refresh from website always re-imports and never changes the current design until a design is chosen (tested where it reaches the store)
- [x] Gallery thumbnails render `brandedConfig(id, brand)`
- [x] Checked in the running app against a site with full branding and a site with none
- [x] `lint`, `check-types`, `test` and `build` are run for `@repo/portal` and `web`, and each is reported as passed, failed (with output) or not run
