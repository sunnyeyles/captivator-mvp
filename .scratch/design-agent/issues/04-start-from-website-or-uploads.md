# 04: Start a design from the customer's website or uploaded images

**What to build:** The assistant's empty state becomes a grid of prompt cards with two new ways to start. **From your website** reads the customer's site through the existing brand import, and **Upload assets** takes their logo and a photo. Either way their logo and background go straight onto the page, and their name, description and colours go to the assistant to theme the design around. Stop or a failed reply takes those images off the page again. Website text reaches the agent as data, never instructions. See `../spec.md`.

**Blocked by:** 02, website-branding 02, smart-crop 02

**Status:** done

- [x] `brandContextSchema` (optional name, description up to 200 characters and http(s) source URL, up to 6 hex colours, `hasLogo`) is an optional `brand` on `designRequestSchema` (tested)
- [x] The route appends the brand to the system prompt as quoted JSON labelled as data, and the prompt themes around its colours, name and description and prefers a just-added image. An invalid brand answers 400 (tested)
- [x] `importBrand` extracts the site description from `og:description`, `description` or `twitter:description`, collapsing spaces and cutting at a word within `BRAND_DESCRIPTION_MAX` (tested)
- [x] `withAssets` places a logo (keeping size and overrides) and a background (keeping fit and overlay through `placedBackgroundImage`), and the merge lets the agent show an uploaded background or switch back to a colour (tested)
- [x] `dominantColors` returns distinct colours by area, merging near shades and ignoring transparent pixels, and `imageColors` reads them in the browser with a canvas (tested)
- [x] `PromptCard` replaces the example prompt buttons, and the empty state is a container-query grid of From your website, Upload assets and the six examples
- [x] From your website opens the website URL form, imports the brand, adds the logo's colours to the site's and sends the brand with its logo and image as assets
- [x] Upload assets takes up to two PNG, JPEG, WebP or SVG files by picker or drag and drop, lets the customer set each as logo or background, keeps SVGs to the logo, positions the background through `prepareBackgroundImage` and frees its object URLs when they never reach the store (`assetFileError` tested)
- [x] Assets are placed inside the streaming preview, and the store keeps the base's images reachable while a reply streams and frees the reply's on failure (tested)
- [x] `lint`, `check-types` and `test` are run for `web`, and each is reported as passed, failed (with output) or not run
