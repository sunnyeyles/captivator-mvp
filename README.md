# Captivator

A visual builder for Wi-Fi splash pages (captive portals). Design a page once and preview it on desktop, tablet and mobile.

The product and technical spec is in [`.scratch/editor/spec.md`](.scratch/editor/spec.md). If you're reviewing the repo, start with the [reviewer notes](docs/REVIEW.md).

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

The design assistant (the editor's AI chat panel) runs on the Vercel AI Gateway. To use it locally, put `AI_GATEWAY_API_KEY` in `apps/web/.env.local`, or run `vercel env pull` for a `VERCEL_OIDC_TOKEN`. `AI_MODEL` optionally swaps the gateway model. Without a key the rest of the editor works, and the assistant says it isn't set up yet. Its spec is in [`.scratch/design-agent/spec.md`](.scratch/design-agent/spec.md).

## Commands

Run from the repo root:

- `pnpm build`, `pnpm lint`, `pnpm check-types`, `pnpm test`: run across every workspace
- `pnpm exec turbo <task> --filter=web`: scope a task to one workspace
- `pnpm format`: Prettier on `**/*.{ts,tsx,md}`
