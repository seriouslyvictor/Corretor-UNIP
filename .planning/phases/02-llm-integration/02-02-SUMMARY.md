---
phase: 02-llm-integration
plan: "02"
subsystem: api+client
tags: [prompts, thinkingBudget, mode-routing, fetch, streaming]

# Dependency graph
requires:
  - phase: 02-llm-integration
    plan: 02-01
    provides: POST /api/solve route and solvedAnswerSchema with confidence field
provides:
  - lib/prompts.ts with buildPrompt(questions, mode) function
  - Mode-aware thinkingBudget routing in /api/solve (0 for no-bs, -1 for verbose)
  - Client-side fetch call in app/page.tsx handleSubmit
affects: [03-gabarito-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mode-aware prompt construction via dedicated prompts.ts module"
    - "thinkingBudget: 0 (no-bs) vs -1 (verbose) for Gemini reasoning control"
    - "Async handleSubmit with fetch POST + ndjson response consumption"
    - "Error boundary in handleSubmit: surface API errors to user, return to input"

key-files:
  created:
    - lib/prompts.ts
  modified:
    - app/api/solve/route.ts
    - app/page.tsx

key-decisions:
  - "buildPrompt includes confidence field in JSON return spec (aligned with actual solvedAnswerSchema)"
  - "thinkingBudget: 0 for no-bs (pure recall, no reasoning tokens), -1 for verbose (dynamic)"
  - "Phase 3 stub: handleSubmit reads full stream text and logs it — progressive streaming deferred to 03-01"

# Metrics
duration: 10min
completed: 2026-04-03
requirements: [SOLVE-04, MODE-01, MODE-02, MODE-03]
---

# Phase 2 Plan 2: Modes and Thinking Routing Summary

**Mode-aware prompt builder (lib/prompts.ts) + thinkingBudget routing in /api/solve + async fetch call from page.tsx completing the end-to-end input-to-stream pipeline**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-03
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `lib/prompts.ts` with `buildPrompt(questions, mode)` generating mode-specific prompt text: No BS requests answer-only output, Verbose requests answer + explanation
- Updated `app/api/solve/route.ts` to import `buildPrompt` and use mode-based `thinkingBudget` routing: `0` for no-bs (pure recall), `-1` for verbose (dynamic Gemini reasoning)
- Updated `app/page.tsx` `handleSubmit` to be async and call `POST /api/solve` with `{ mode, questions }` body, handle errors gracefully, and log the streamed response for Phase 3 consumption

## Task Commits

1. **Task 1: Create prompt builder and wire mode routing** - `7eb7b65` (feat)
2. **Task 2: Wire client-side API call in app/page.tsx** - `39f057e` (feat)

## Files Created/Modified

- `lib/prompts.ts` — `buildPrompt(questions, mode)` producing mode-specific system instruction + question block
- `app/api/solve/route.ts` — Replaced hardcoded prompt with `buildPrompt`; added `thinkingBudget: mode === "no-bs" ? 0 : -1` to `providerOptions`
- `app/page.tsx` — `handleSubmit` made async; added `fetch("/api/solve", { method: "POST", ... })` call with error handling

## Decisions Made

- `buildPrompt` includes `confidence (high|medium|low)` in the return spec because `solvedAnswerSchema` (from 02-01) already has that field — keeping prompt and schema aligned
- `thinkingBudget: 0` for No BS: fastest path, no reasoning tokens spent — correct for factual recall questions
- `thinkingBudget: -1` for Verbose: Gemini decides how much reasoning to apply — appropriate for questions needing explanation
- Streaming consumption in Phase 3: `handleSubmit` currently reads full text and logs it; progressive streaming UI is the 03-01 responsibility

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `handleSubmit` reads full stream text (`response.text()`) and logs it. The Phase 3 plan (03-01) will replace this with progressive ndjson parsing and UI updates. This stub does not prevent the plan's goal (wiring the API call) from being achieved.

---
*Phase: 02-llm-integration*
*Completed: 2026-04-03*
