# Project State

**Project:** Corretor UNIP
**Milestone:** v1 MVP
**Updated:** 2026-04-03

## Current Status

**Phase:** Phase 2 — LLM Integration (Plan 2/2 complete)
**Next action:** Execute Phase 3 Plan 1 (03-01: Results page and gabarito grid)

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.
**Current focus:** Phase 3 — Gabarito UI

## Phase Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Foundation | Complete | 3/3 plans complete |
| 2 — LLM Integration | Complete | 2/2 plans complete |
| 3 — Gabarito UI | Not started | 2 plans |

## Key Technical Context

- AI SDK 6: `streamText` + `Output.array()` — `generateObject` is deprecated
- LLM: `gemini-2.5-flash` with `thinkingBudget: 0` (recall) or `-1` (dynamic reasoning)
- Images: `{ type: 'image', image: base64String, mimeType: 'image/png' }` in message parts
- Streaming needed to avoid Vercel Hobby 10s timeout
- Packages: `ai@^6.0.0`, `@ai-sdk/google@^3.0.0`, `zod@^3.23.8`

## Key Decisions

- streamText + Output.array() (not streamObject — deprecated in AI SDK 6) for structured LLM output
- elementStream piped as ndjson to client for progressive answer delivery
- thinkingBudget: -1 (dynamic) for Verbose, thinkingBudget: 0 for No BS (pure recall)
- toDataStreamResponse() not in ai@6.0.145 — used custom ReadableStream wrapping elementStream
- SolvedAnswer schema: { questionIndex, answer (A-E), confidence, explanation? }
- buildPrompt(questions, mode) in lib/prompts.ts — mode-specific prompt construction isolated from route
- handleSubmit in page.tsx: async fetch POST /api/solve; errors surface to user; stream consumed in Phase 3

## Artifacts

- `.planning/PROJECT.md` — project context and requirements
- `.planning/REQUIREMENTS.md` — 19 v1 requirements across 3 phases
- `.planning/ROADMAP.md` — 3-phase coarse roadmap
- `.planning/research/RESEARCH.md` — Vercel AI SDK + Gemini research
- `.planning/codebase/` — 7 codebase map documents
- `lib/schemas.ts` — shared Zod schemas: ParsedQuestion, SolveRequest, SolvedAnswer
- `lib/prompts.ts` — buildPrompt(questions, mode) mode-aware prompt builder
- `app/api/solve/route.ts` — streaming POST handler (gemini-2.5-flash, ndjson output, mode-aware thinkingBudget)
- `app/page.tsx` — input page with async handleSubmit calling /api/solve
- `.planning/phases/02-llm-integration/02-01-SUMMARY.md` — plan 02-01 execution summary
- `.planning/phases/02-llm-integration/02-02-SUMMARY.md` — plan 02-02 execution summary
