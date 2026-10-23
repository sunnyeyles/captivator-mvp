# Saved designs and publishing

**Status:** ready-for-agent

## Problem Statement

Everything a user builds in the editor is lost when they reload the page. They can't keep more than one splash page, can't come back to one later, and can't tell which page guests would actually see. The product is meant to lead to a published portal (spec §16), but nothing in the app shows that step. This is a demo, so the backend can be stubbed. It still needs to look and behave like the real flow, with a clear point where a real backend can be plugged in later.

## Solution

Users keep a library of named **Designs**. The library is the app's home page. Each card shows a rendered thumbnail, the design's status and its actions. Opening a design loads it into the existing editor. Saving is explicit, and the toolbar shows when there are unsaved changes.

Users can **Publish** one design at a time, which makes it **Live**. Publishing freezes a snapshot of the design, so later edits don't reach guests until the user publishes again. If another design is already live, the user confirms before it's replaced. A **Take offline** action, also confirmed, removes the live design. A `/live` page renders the live snapshot as a guest would see it.

All persistence goes through one async repository interface. For the demo it's implemented by a localStorage stub with fake latency.

## User Stories

1. As a user, I want my designs saved, so that I don't lose my work when I reload or close the tab.
2. As a user, I want to keep several named designs, so that I can prepare different splash pages for different occasions.
3. As a user, I want a library page listing all my designs, so that I can find and open any of them.
4. As a user, I want each design card to show a rendered thumbnail, so that I can recognise designs at a glance.
5. As a user, I want each card to show when the design was last edited, so that I can find recent work.
6. As a user, I want an empty state with a "New design" action when I have no designs, so that I know how to get started.
7. As a user, I want "New design" to let me pick a template, so that every design starts from a professional preset.
8. As a user, I want a new design named after its template by default, so that I don't have to name it before I start.
9. As a user, I want to rename a design from the library and from the editor toolbar, so that names stay meaningful.
10. As a user, I want to duplicate a design, so that I can try a variation without touching the original.
11. As a user, I want to delete a design I no longer need, after a confirmation, so that I don't delete one by accident.
12. As a user, I want deleting the live design to be blocked with a hint to take it offline first, so that I can never remove what guests are seeing by accident.
13. As a user, I want clicking a card to open that design in the editor, so that I can keep editing it.
14. As a user, I want each design to have its own URL, so that I can reload or bookmark it.
15. As a user, I want a "Design not found" page with a link back to the library when a design doesn't exist, so that I'm never stuck.
16. As a user, I want a back link to the library in the editor toolbar, so that I can switch designs easily.
17. As a user, I want the design name shown in the toolbar, so that I always know which design I'm editing.
18. As a user, I want a Save button and ⌘S/Ctrl+S, so that I decide when my changes are stored.
19. As a user, I want an "Unsaved changes" indicator, so that I know when the stored design is behind what I see.
20. As a user, I want the indicator to clear if I undo back to the saved state, so that it reflects real differences, not just edit activity.
21. As a user, I want to be asked before leaving the editor with unsaved changes, by the back link or by closing or reloading the tab, so that I don't lose work.
22. As a user, I want undo history to start fresh each time I open a design, so that undo never jumps into another design.
23. As a user, I want uploaded logos and backgrounds kept in saved designs, so that they're still there after a reload.
24. As a user, I want a clear error when a save fails, for example because storage is full, so that I know my work wasn't saved.
25. As a user, I want to see a pending state while saving or publishing, so that I know the action is in progress.
26. As a user, I want to publish a design from the editor toolbar, so that I can make it live as soon as I'm happy with it.
27. As a user, I want publishing from the editor to save my unsaved changes first, so that what goes live is what I see.
28. As a user, I want to publish or take offline from a library card's menu, so that I can manage what's live without opening the editor.
29. As a user, I want only one design live at a time, so that it's always clear what guests see.
30. As a user, I want to confirm before publishing replaces a live design ("'Summer promo' is live. Replace it with 'Default'?"), so that I don't swap the guest page by accident.
31. As a user, I want my first publish, when nothing is live, to happen without a confirmation, so that the common case is quick.
32. As a user, I want to take the live design offline after a confirmation, so that I can stop showing a page without deleting it.
33. As a user, I want publishing to freeze a snapshot, so that later edits don't reach guests until I publish again.
34. As a user, I want a Live badge on the live design's card and in the editor toolbar, so that I can see what's live from anywhere.
35. As a user, I want a design shown as "Live · unpublished changes" when its saved version differs from the live snapshot, so that I know to publish again.
36. As a user, I want designs that have never been live shown as Draft, so that status is never ambiguous.
37. As a user, I want a "View live" link from the Live badge, so that I can see exactly what guests get.
38. As a user, I want the live page to render the published snapshot as a guest would see it, with the Connect button doing nothing, so that I can check it safely.
39. As a user, I want the live page to say "Nothing is live" when nothing is published, so that the state is obvious.
40. As a developer, I want all persistence behind one async repository interface, so that a real backend (Supabase) can replace the stub without changing the UI.
41. As a developer, I want the stub to add fake latency, so that loading and pending states are exercised the way a real backend would.

## Implementation Decisions

**Domain terms**, added to the glossary:

- **Design**: a saved, named portal configuration a user can edit.
- **Publish**: freezing a snapshot of a design as the live page.
- **Live**: the one published snapshot guests would see.

The existing term "portal" keeps meaning the rendered splash page and the `@repo/portal` package.

**Data shapes.** Both records reuse the portal schema's types.

```ts
interface Design {
  id: string;
  name: string;
  templateId: TemplateId;
  config: PortalConfig;
  updatedAt: string; // ISO
}

interface LiveDesign {
  designId: string;
  designName: string;
  templateId: TemplateId;
  config: PortalConfig;
  publishedAt: string; // ISO
}
```

Device mode, canvas mode and selection are editor state and are never saved.

**Design repository.** This is the one boundary to the future backend. It's an async interface with these methods: `list`, `get(id)` (returns nothing for an unknown id), `create(templateId, name)`, `rename`, `duplicate`, `save(id, { config, templateId })`, `remove`, `publish(id)`, `unpublish`, `getLive`.

- `publish` copies the design's saved config into the single live record, which replaces any existing one.
- `remove` rejects when the design is live.
- It lives in the web app for now. Move it to a package only when a second workspace needs it.

**localStorage stub.** This implements the repository.

- It takes a `Storage` and a delay (default about 300ms) as constructor arguments. No failure injection.
- On save, `blob:` image URLs are converted to data URLs so they survive a reload. This is the only place image persistence happens. Real asset storage would replace it here.
- A storage quota error is returned as a save failure. Storage capacity doesn't matter for the demo.

**Status** is a pure function of a design and the live record, computed during render:

- `draft` when the design isn't live.
- `live` when its saved config equals the snapshot.
- `live-changed` when they differ.

Use the existing deep-equality helper.

**Editor store** gains:

- An action that loads a design: it sets config and templateId, clears undo history and records a saved baseline.
- A way to update the baseline after a successful save.

"Unsaved changes" is derived by comparing the current config and templateId with the baseline, so undoing back to the saved state clears it. The store stays free of repository calls. Components call the repository and then update the store. The renderer stays unaware of all of this.

**Routing:**

- `/` is the Designs library.
- `/designs/[id]` is the editor for one design.
- `/live` is the live page.

Data comes from localStorage, so loading happens in small client leaves, while pages stay Server Components where possible.

**Library page.** It shows a grid of cards. Each card has:

- A thumbnail: a scaled-down, non-interactive `SplashPage` on the mobile device in preview mode.
- The name, last edited time and a status badge.
- A menu with Rename, Duplicate, Publish / Take offline and Delete.

Clicking the card opens the design. On the live card, Delete is disabled with the hint "Take it offline before deleting". Deleting any other design asks for confirmation. "New design" opens the existing template gallery. Picking a template creates a design named after it and opens it.

**Editor toolbar additions:**

- A back link to the library, with a confirmation if there are unsaved changes.
- An inline-editable design name and the status badge.
- An "Unsaved changes" indicator.
- A Save button, with ⌘S/Ctrl+S.
- A Publish button that saves first if needed.
- A `beforeunload` guard while there are unsaved changes.

The existing template picker inside the editor keeps working as it does now: it changes the current design's template.

**Publish confirmations:**

- Confirm only when publishing would replace a different live design, and name both designs.
- Republishing the live design and a first publish go straight through.
- Take offline always confirms.

Use the shadcn alert dialog.

**Live page.** It renders the live snapshot with `SplashPage` in `mode: "published"`, which never makes a network connection. When nothing is live it shows a "Nothing is live" empty state with a link to the library.

## Testing Decisions

Keep it simple, since this is a demo. Tests check external behaviour through public interfaces only, in Vitest's node environment, next to the code. There are no component or browser tests. UI flows are checked by running the app by hand.

- **Design repository (main seam):** test the localStorage stub with an in-memory `Storage` and zero delay. Cover:
  - The create/list/get/rename/duplicate/save/remove round trip.
  - An unknown id returns nothing.
  - Publish replaces the previous live record.
  - The live record is a snapshot, so later saves don't change it.
  - Remove rejects for the live design.
  - Unpublish clears the live record.
  - A quota error is returned as a save failure.
- **Status function:** draft, live and live-changed.
- **Editor store:** loading a design resets history and sets the baseline. The unsaved changes flag turns on after an edit and off after undoing back to the baseline or recording a new baseline.

Prior art: `editor-store.test.ts` resets the store state before each test and drives actions through `getState`. `images.test.ts` injects a dependency (`revoke`) instead of mocking globals. Do the same with `Storage`.

## Out of Scope

- A real backend, authentication, workspaces, rentals, and multiple live designs per network or venue. The repository interface leaves room for these.
- Autosave, version history of past publishes, and rolling back to an earlier publish.
- Simulating failures in the stub, and storage capacity beyond what localStorage gives.
- Real network connections from the live page, and any actual guest-facing hosting.
- Saving device mode, canvas mode or selection.
- Sharing designs between users or browsers.

## Further Notes

- The spec's §15 "Local Persistence" and §16 publishing flow are what this feature delivers in demo form. Once it lands, update `docs/MVP_SPEC.md` to describe Designs, Publish and Live.
- Blob URLs are revoked when they leave the editor history. Data URLs from saved designs aren't object URLs, so the existing revoke logic ignores them.
