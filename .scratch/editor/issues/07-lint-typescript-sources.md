# 07: Lint TypeScript sources

**What to build:** `pnpm lint` actually checks the TypeScript and TSX source in every workspace. Today the shared ESLint config only matches JS config files, so lint passes without looking at any `.ts`/`.tsx` code and `check-types` is the only real check on the source. With this ticket, lint parses TS and TSX, applies the shared rules to every source file, and still runs with `--max-warnings 0`. `typescript-eslint` is approved as an addition to the spec's stack for this.

**Blocked by:** 05, 06 (run once the whole stack has landed, so every file is linted at once)

**Status:** ready-for-agent

- [ ] `typescript-eslint` is installed in the shared ESLint config package
- [ ] The shared config matches `.ts` and `.tsx` files and parses TS and TSX syntax, including in Next.js and React workspaces
- [ ] Every workspace's `lint` checks its source files (verified by introducing a deliberate violation and seeing lint fail, then removing it)
- [ ] Any violations surfaced in existing code are fixed rather than suppressed; any rule disabled is justified in a one-line comment
- [ ] The import guard test for `packages/portal` stays in place, or is replaced by an equivalent lint rule that fails on Zustand or editor imports
- [ ] AGENTS.md no longer says lint skips TypeScript
- [ ] `lint`, `check-types`, tests and `build` are run for every workspace touched, and each is reported as passed, failed (with output) or not run
