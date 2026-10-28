# V2 Phase 10 — TypeScript migration

Goal: convert the codebase to strict TypeScript without changing behavior.

## Steps

1. **Compiler setup.** A `tsconfig.json` enables `strict` mode, and `bun run typecheck` runs `tsc --noEmit` over the whole project. `next build` type-checks as part of the build.
2. **Shared domain types.** `lib/types.ts` defines the shared domain types — planner input, growing areas (beds), plant groups, layout, plan, planting-guide entries, alternatives, climate context, chat messages, and saved seasons — and the AI response types are inferred from the Zod schemas.
3. **Full conversion.** Every JavaScript source file under `lib/`, `app/`, and `e2e/` is converted (`.js` → `.ts`, `.jsx` → `.tsx`), including tests, with no JavaScript source files left in those folders. Build-tool config files at the project root may stay `.mjs`.
4. **No escape hatches.** The converted code contains no `any` type annotations and no `@ts-ignore`, `@ts-nocheck`, or `@ts-expect-error` comments.
5. **Unchanged behavior.** `bun run test`, `bun run lint`, `bun run typecheck`, `bun run build`, and `bun run test:e2e` pass, and the number of passing unit tests is unchanged (83).
