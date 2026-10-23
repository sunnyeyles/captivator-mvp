# 01: Designs library on a stubbed repository

**What to build:** A user lands on a Designs library instead of a blank editor. They can create a design from a template, see every design they've made as a card with a rendered thumbnail, and rename, duplicate or delete any of them. Clicking a card opens that design in the editor at its own URL, and a back link returns to the library. All of this goes through one async `DesignRepository` interface. For the demo it's implemented by a localStorage stub with fake latency, so a real backend can replace it later without UI changes. See `.scratch/designs/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A `Design` record (id, name, templateId, config, updatedAt) built on the portal schema's types, and an async `DesignRepository` with `list`, `get` (returns nothing for an unknown id), `create`, `rename`, `duplicate`, `save` and `remove`
- [x] A localStorage stub that implements the repository, takes its `Storage` and its delay (default about 300ms) as constructor arguments, and has no failure injection (tested with an in-memory `Storage` and zero delay: the round trip, and an unknown id)
- [x] `/` is the Designs library: a grid of cards, each showing a scaled-down, non-interactive mobile `SplashPage` thumbnail, the name and the last edited time, plus a loading state and an empty state with "New design"
- [x] "New design" opens the existing template gallery, and picking a template creates a design named after it and opens it
- [x] Each card's menu offers Rename, Duplicate and Delete, and Delete asks for confirmation
- [x] The editor lives at `/designs/[id]`: it loads the design into the store, which starts undo history fresh (tested), and the toolbar shows a back link to the library and the design name
- [x] An unknown design id shows "Design not found" with a link back to the library
- [x] The existing template picker in the editor still changes the current design's template
- [x] `lint`, `check-types`, tests and `build` are run for every workspace touched, and each is reported as passed, failed (with output) or not run
