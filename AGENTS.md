<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Project

A visual Wi-Fi splash page (captive portal) builder. `.scratch/editor/spec.md` is the product and technical spec, so read it before building features. The spec's stack is installed: Tailwind, Zustand and Lucide in `apps/web`, shadcn/ui in `packages/ui`, Zod in `packages/portal`, plus Vitest for tests.

## Commands

pnpm workspace (pnpm 11, Node >= 24) orchestrated by Turborepo. Run from the root:

- `pnpm dev`: the `web` app on :3000
- `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm test`: run across every workspace
- `pnpm exec turbo <task> --filter=web`: scope a task to one workspace
- `pnpm exec turbo test:watch --filter=<workspace>`: Vitest in watch mode
- `pnpm format`: Prettier on `**/*.{ts,tsx,md}`

Lint runs with `--max-warnings 0`, so any warning fails the build. It enforces the comment format and package-name imports (`packages/eslint-config/rules`) and no hard-coded colours in editor UI (`apps/web/eslint.config.js`), so a hit from those rules is the rule itself, not noise. Lint checks `.ts` and `.tsx` source with `typescript-eslint`, which parses with its own TypeScript 6 in `packages/eslint-config` because TypeScript 7 has no JS API; `tsc` and `check-types` use TypeScript 7. Tests use Vitest, one `vitest.config.ts` per workspace, with test files beside the code as `*.test.ts(x)`.

Before calling a change done, run `lint`, `check-types` and `test` for every workspace it touches and fix what it broke. Report each check as run and passed, run and failed (with output), or not run.

## Architecture (from .scratch/editor/spec.md)

- `apps/web`: editor shell (toolbar, properties sidebar, design canvas), the Zustand store, and for now the editor theme tokens (`app/globals.css`)
- `packages/portal`: portal config schema (Zod), defaults, templates and the `SplashPage` renderer
- `packages/ui`: the shadcn/ui primitives, imported as `@repo/ui/<component>`; theme tokens move here once a second workspace needs them

Code used by one app lives in that app. Move it into a package once a second workspace needs it, and import other workspaces by package name, never by relative path.

Constraints that span these packages:

- Data flows one way: controls/canvas → Zustand store → `PortalConfig` → renderer → desktop/mobile view.
- The renderer (`SplashPage({ config, device, mode })`) must not import Zustand or editor code. It stays reusable for published pages, and the editor passes callbacks in.
- Templates are config presets drawn by the shared renderer, never separate page implementations.
- Desktop, tablet and mobile share one config. Device-specific values are explicit overrides that fall back to the shared value.
- Customer branding styles only the portal canvas, never the editor UI.
- At most two guest fields. Preview never triggers a real network connection.

## Writing code

- **Scope:** make the smallest change that does the task, in the style of the surrounding code. Leave unrelated code, files and uncommitted changes as they are.
- **Simplicity:** write the direct version first. Add an abstraction when a second real caller needs it, not before.
- **Reuse:** search `packages/` and the current app for an existing component, hook, utility or type before writing a new one.
- **TypeScript:** keep types strict. Derive types from their source (`z.infer` on the portal schema, component props) and use `unknown` plus narrowing where a value is truly untyped, never `any`.
- **React:** default to Server Components. Put `"use client"` on the smallest leaf that needs state, effects or browser APIs, and compute derived values during render instead of syncing them through state and effects.
- **UI:** build editor UI from the shadcn/ui components and theme tokens in `apps/web`, styled with Tailwind utilities rather than custom CSS or hard-coded colours.
- **Dependencies:** use native platform APIs and installed packages first. Add only the spec's stack or a package the user approves.
- **Safety:** ask before destructive operations (force push, `git reset --hard`, deleting files you did not create). Keep secrets in gitignored `.env*` files, never in code or commits.

## Comments (hard rule)

Every code comment follows one format:

- One line, sentence case, no trailing period, `//` style (`{/* */}` in JSX)
- Says _why_ or flags a non-obvious constraint. Never restate what the code does
- No banner or divider comments, commented-out code, or TODOs without a ticket path (e.g. `// TODO(.scratch/editor/issues/03): ...`)
- JSDoc only on exported package APIs, and one sentence at most
- If a comment needs more than one line, rename or restructure the code until it doesn't

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
