# 04: Images: logo and background

**What to build:** A user can upload, replace and remove a logo, and choose between a solid colour and an uploaded image for the background, with image fit and position and an optional overlay. Uploads accept PNG, JPEG and WebP within a size limit and show a clear message when rejected. The logo is selectable in the canvas. Images are held as browser object URLs during editing and cleaned up when no longer needed.

**Blocked by:** 02

**Status:** done

- [x] Schema models the logo reference and background as either a solid colour or an image with fit, position and optional overlay (tested)
- [x] Upload validation accepts PNG, JPEG and WebP within a size limit and rejects anything else with a user-facing message (tested)
- [x] Sidebar Branding and images group uploads, replaces and removes the logo
- [x] Sidebar Background group switches between colour and image, and sets fit, position and overlay
- [x] Object URLs are revoked when an image is replaced, removed or no longer referenced (tested)
- [x] Logo is selectable in the canvas using the pattern from 02
- [x] Logo and background render correctly in desktop and mobile layouts
