# Spec Audit — docs/V2-PHASE10.md

Source document: `docs/V2-PHASE10.md`. Scope: steps 1–5.

## Checklist

1. S1: "A `tsconfig.json` enables `strict` mode, and `bun run typecheck` runs `tsc --noEmit` over the whole project."
2. S1: "`next build` type-checks as part of the build."
3. S2: "`lib/types.ts` defines the shared domain types — planner input, growing areas (beds), plant groups, layout, plan, planting-guide entries, alternatives, climate context, chat messages, and saved seasons"
4. S2: "the AI response types are inferred from the Zod schemas"
5. S3: "Every JavaScript source file under `lib/`, `app/`, and `e2e/` is converted (`.js` → `.ts`, `.jsx` → `.tsx`), including tests, with no JavaScript source files left in those folders."
6. S4: "no `any` type annotations and no `@ts-ignore`, `@ts-nocheck`, or `@ts-expect-error` comments"
7. S5: "`bun run test`, `bun run lint`, `bun run typecheck`, `bun run build`, and `bun run test:e2e` pass"
8. S5: "the number of passing unit tests is unchanged (83)"
