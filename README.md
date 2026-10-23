# Captivator

A visual builder for Wi-Fi splash pages (captive portals). Design a page once and preview it on desktop, tablet and mobile.

The product and technical spec is in [`docs/MVP_SPEC.md`](docs/MVP_SPEC.md).

## Workspaces

- `apps/web`: the editor (Next.js), with the toolbar, properties sidebar, design canvas and Zustand store
- `packages/portal`: the portal config schema (Zod), defaults, templates and the `SplashPage` renderer
- `packages/ui`: shared shadcn/ui components
- `packages/eslint-config`, `packages/typescript-config`: shared tooling config

## Getting started

Requires Node >= 24 and pnpm 11.

```sh
pnpm install
pnpm dev
```

The editor runs on http://localhost:3000.

## Commands

Run from the repo root:

- `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm test`: run across every workspace
- `pnpm exec turbo <task> --filter=web`: scope a task to one workspace
- `pnpm format`: Prettier on `**/*.{ts,tsx,md}`
