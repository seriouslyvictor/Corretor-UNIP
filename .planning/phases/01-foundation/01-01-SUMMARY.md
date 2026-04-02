---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [ai-sdk, vercel-ai, google-gemini, zod, typescript]

# Dependency graph
requires: []
provides:
  - "ai@6, @ai-sdk/google@3, zod@3 installed as runtime dependencies"
  - "GOOGLE_GENERATIVE_AI_API_KEY documented for server-side use in .env.local.example"
  - "lib/schemas.ts with ParsedQuestion, ParsedOption, SolveRequest Zod schemas and types"
affects:
  - "01-02 (parser imports ParsedQuestion from lib/schemas.ts)"
  - "01-03 (UI imports SolveRequest/ParsedQuestion for form types)"
  - "phase-2 (API route imports solveRequestSchema for validation)"

# Tech tracking
tech-stack:
  added:
    - "ai@6.0.143 — Vercel AI SDK core"
    - "@ai-sdk/google@3.0.55 — Gemini provider for Vercel AI SDK"
    - "zod@3.25.76 — runtime schema validation"
  patterns:
    - "Shared Zod schemas in lib/schemas.ts as single source of truth for parser/UI/API contract"
    - "API key isolated to server-side only via .env.local (covered by .gitignore .env*.local)"

key-files:
  created:
    - "lib/schemas.ts"
    - ".env.local.example"
  modified:
    - "package.json"
    - "pnpm-lock.yaml"

key-decisions:
  - "Installed ai@^6 not ai@^5 — AI SDK 6 uses streamText + Output.array() (generateObject is deprecated)"
  - "All three packages placed in runtime dependencies, not devDependencies"
  - "lib/schemas.ts exports both Zod schemas and inferred TypeScript types for full type safety"

patterns-established:
  - "Shared schema file: lib/schemas.ts is the single source of truth for cross-layer data shapes"
  - "Server-side secrets: only GOOGLE_GENERATIVE_AI_API_KEY needed; documented in .env.local.example"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 01 Plan 01: Dependencies and Shared Schemas Summary

**ai@6 + @ai-sdk/google@3 + zod@3 installed; ParsedQuestion/SolveRequest Zod schemas created as cross-layer contract in lib/schemas.ts**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-02T15:03:59Z
- **Completed:** 2026-04-02T15:05:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed `ai@6.0.143`, `@ai-sdk/google@3.0.55`, `zod@3.25.76` as runtime dependencies
- Created `.env.local.example` documenting `GOOGLE_GENERATIVE_AI_API_KEY` as server-side only
- Created `lib/schemas.ts` with `parsedOptionSchema`, `parsedQuestionSchema`, `solveRequestSchema` and their TypeScript inferred types
- `pnpm build` and `pnpm typecheck` both exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK, Google provider, and Zod** - `480941f` (chore)
2. **Task 2: Create env template and shared Zod schemas** - `b02208c` (feat)

**Plan metadata:** _(to be added by final commit)_

## Files Created/Modified

- `package.json` - Added ai, @ai-sdk/google, zod to runtime dependencies
- `pnpm-lock.yaml` - Updated lockfile for new packages
- `.env.local.example` - API key placeholder with server-side-only comment
- `lib/schemas.ts` - Shared Zod schemas: parsedOptionSchema, parsedQuestionSchema, solveRequestSchema; types: ParsedOption, ParsedQuestion, SolveRequest

## Decisions Made

- Used `ai@^6` (not v5) — AI SDK 6 uses `streamText + Output.array()` since `generateObject` is deprecated in v6
- All packages are runtime dependencies, not devDependencies, since they run in the API route at request time
- `lib/schemas.ts` exports both Zod schemas and TypeScript inferred types so both runtime validation and static typing are available from one import

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — install, typecheck, and build all passed on first attempt.

## User Setup Required

**Developer must create `.env.local` before running the app with LLM features.**

Copy `.env.local.example` to `.env.local` and fill in the key:

```bash
cp .env.local.example .env.local
# Then edit .env.local and set GOOGLE_GENERATIVE_AI_API_KEY=<your-key>
# Get key at: https://aistudio.google.com/app/apikey
```

`.env.local` is already in `.gitignore` (covered by `.env*.local` pattern) and will never be committed.

## Next Phase Readiness

- Plan 01-02 (HTML parser) can now import `ParsedQuestion` from `lib/schemas.ts`
- Plan 01-03 (UI) can import `SolveRequest` for form state typing
- Phase 2 API route can import `solveRequestSchema` for request body validation
- No blockers for downstream plans

## Self-Check: PASSED

- FOUND: package.json (with ai, @ai-sdk/google, zod in dependencies)
- FOUND: .env.local.example
- FOUND: lib/schemas.ts
- FOUND: pnpm-lock.yaml
- FOUND commit: 480941f (Task 1 - install dependencies)
- FOUND commit: b02208c (Task 2 - env template + schemas)

---
*Phase: 01-foundation*
*Completed: 2026-04-02*
