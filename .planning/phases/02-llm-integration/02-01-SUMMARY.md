---
phase: 02-llm-integration
plan: 01
subsystem: api
tags: [vercel-ai-sdk, gemini, zod, streaming, ndjson]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: parsedQuestionSchema and SolveRequest types (also created here as 01-01 was not executed)
provides:
  - solvedAnswerSchema and SolvedAnswer Zod type (lib/schemas.ts)
  - POST /api/solve streaming route using streamText + Output.array()
  - newline-delimited JSON streaming of per-question answer objects
affects: [03-gabarito-ui, 02-02]

# Tech tracking
tech-stack:
  added: [ai@6.0.145, "@ai-sdk/google@3.0.58", zod@3.25.76]
  patterns: [streamText + Output.array() for structured streaming, elementStream for per-element progressive delivery, ndjson streaming to client, Zod safeParse for request validation]

key-files:
  created:
    - lib/schemas.ts
    - app/api/solve/route.ts
    - .planning/phases/02-llm-integration/02-01-PLAN.md
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "streamText + Output.array() over streamObject (AI SDK 6 pattern, streamObject deprecated)"
  - "elementStream piped to ReadableStream as ndjson so client can process answers as they arrive"
  - "thinkingBudget: -1 (dynamic) as default - model decides reasoning depth per question"
  - "ai, @ai-sdk/google, zod installed here as phase 01 was not executed (blocking deviation)"
  - "toDataStreamResponse() not available in ai@6.0.145 - used elementStream + custom ReadableStream instead"

patterns-established:
  - "Structured streaming: streamText({ output: Output.array({ element: schema }) }) + iterate elementStream"
  - "Route validation: solveRequestSchema.safeParse(body) with 400 on failure"
  - "Image parts: { type: 'image', image: base64string, mimeType: 'image/png' } appended after text part"
  - "ndjson streaming: JSON.stringify(answer) + newline per element, Content-Type: application/x-ndjson"

requirements-completed: [SOLVE-01, SOLVE-02, SOLVE-03, SOLVE-05]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 2 Plan 1: Zod Schemas and Solve Route Summary

**Streaming POST /api/solve using AI SDK 6 streamText + Output.array() delivering validated SolvedAnswer objects as ndjson via Gemini 2.5 Flash**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T17:50:41Z
- **Completed:** 2026-04-03T17:54:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `lib/schemas.ts` with complete type contract: parsedOptionSchema, parsedQuestionSchema, solveRequestSchema, solvedAnswerSchema, solvedAnswersSchema and all inferred TypeScript types
- Created `app/api/solve/route.ts` streaming handler that validates input, builds question + image content arrays, calls Gemini with dynamic thinking, and streams per-question answers as ndjson
- Installed ai@6.0.145, @ai-sdk/google@3.0.58, zod@3.25.76 (prerequisites from Phase 1 that were not yet executed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add solvedAnswerSchema and SolvedAnswer to lib/schemas.ts** - `69f0e18` (feat)
2. **Task 2: Create streaming POST /api/solve route** - `a54cd9d` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified

- `lib/schemas.ts` - All shared Zod schemas: ParsedOption, ParsedQuestion, SolveRequest, SolvedAnswer + array wrapper
- `app/api/solve/route.ts` - Streaming POST handler with Zod validation, Gemini call, ndjson element stream
- `package.json` - Added ai, @ai-sdk/google, zod dependencies
- `pnpm-lock.yaml` - Updated lockfile
- `.planning/phases/02-llm-integration/02-01-PLAN.md` - Plan file (created as it did not exist)

## Decisions Made

- Used `streamText` + `Output.array()` as `streamObject` is deprecated in AI SDK 6
- Streamed responses as newline-delimited JSON (ndjson) using `elementStream` — each completed answer object emitted as soon as Gemini finishes it, enabling progressive UI updates
- `thinkingBudget: -1` (dynamic) so Gemini decides how much reasoning to apply per question batch — safe default that works for both fact-recall and logical reasoning questions
- `maxDuration = 60` exported for Vercel Pro timeout support
- Custom `ContentPart` type alias used to avoid TypeScript inference issues with the SDK's complex overloaded types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing AI SDK packages**
- **Found during:** Task 1 pre-check
- **Issue:** ai, @ai-sdk/google, and zod were not in node_modules (Phase 01-01 was never executed). TypeScript imports would fail without them.
- **Fix:** Ran `pnpm add ai@^6.0.0 @ai-sdk/google@^3.0.0 zod@^3.23.8` before implementing schemas
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** pnpm typecheck exits 0 after install
- **Committed in:** 69f0e18 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript error in content array typing**
- **Found during:** Task 2 (first typecheck run)
- **Issue:** `Parameters<typeof streamText>[0]["messages"][number]["content"]` caused TS2537 — complex SDK union type not indexable
- **Fix:** Replaced with explicit `ContentPart` type alias union covering text and image parts
- **Files modified:** app/api/solve/route.ts
- **Verification:** pnpm typecheck exits 0
- **Committed in:** a54cd9d (Task 2 commit)

**3. [Rule 1 - Bug] Used elementStream + custom ReadableStream instead of toDataStreamResponse()**
- **Found during:** Task 2 (API design)
- **Issue:** `toDataStreamResponse()` does not exist in ai@6.0.145 (the method was renamed/removed). Only `toTextStreamResponse()` and `toUIMessageStreamResponse()` are available.
- **Fix:** Piped `result.elementStream` into a `ReadableStream` manually, encoding each answer as ndjson
- **Files modified:** app/api/solve/route.ts
- **Verification:** pnpm build succeeds, route appears as ƒ /api/solve (dynamic)
- **Committed in:** a54cd9d (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking dependency, 2 bugs/API mismatch)
**Impact on plan:** All fixes necessary. The API change from toDataStreamResponse to ndjson elementStream is functionally equivalent and cleaner for the consumer.

## Issues Encountered

- `toDataStreamResponse()` mentioned in RESEARCH.md is not available in the installed version (ai@6.0.145). The research was based on an earlier API snapshot. Resolution: used elementStream with a manual ReadableStream wrapper emitting ndjson — gives client the same progressive streaming capability.

## User Setup Required

None — no external service configuration required beyond `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` (documented in prior phase planning, `.env.local.example` to be created in Phase 01-01).

## Next Phase Readiness

- `app/api/solve/route.ts` is ready to receive `SolveRequest` payloads
- Client will need to parse ndjson stream: read chunks, split on newline, JSON.parse each line
- Phase 02-02 will wire in mode-specific prompts and thinkingBudget heuristics
- Phase 01 (parser + UI) still needs execution before end-to-end flow works

---
*Phase: 02-llm-integration*
*Completed: 2026-04-03*
