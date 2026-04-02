# Project State

**Project:** Corretor UNIP
**Milestone:** v1 MVP
**Updated:** 2026-04-02

## Current Status

**Phase:** 01-foundation — in progress
**Current Plan:** 2 / 3
**Next action:** Execute Plan 01-02 (HTML parser)

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.
**Current focus:** Phase 1 — Foundation

## Phase Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Foundation | In progress (1/3 done) | 3 plans |
| 2 — LLM Integration | Not started | 2 plans |
| 3 — Gabarito UI | Not started | 2 plans |

## Key Technical Context

- AI SDK 6: `streamText` + `Output.array()` — `generateObject` is deprecated
- LLM: `gemini-2.5-flash` with `thinkingBudget: 0` (recall) or `-1` (dynamic reasoning)
- Images: `{ type: 'image', image: base64String, mimeType: 'image/png' }` in message parts
- Streaming needed to avoid Vercel Hobby 10s timeout
- Packages: `ai@^6.0.0`, `@ai-sdk/google@^3.0.0`, `zod@^3.23.8`

## Decisions

| Phase-Plan | Decision | Rationale |
|------------|----------|-----------|
| 01-01 | ai@^6 (not v5) installed | AI SDK 6 uses streamText + Output.array(); generateObject deprecated |
| 01-01 | All AI/Zod packages in runtime dependencies | Used in API route at request time, not build-only |
| 01-01 | lib/schemas.ts as shared schema contract | Single source of truth for parser, UI, and API route types |

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01 | 2min | 2 | 4 |

## Artifacts

- `.planning/PROJECT.md` — project context and requirements
- `.planning/REQUIREMENTS.md` — 19 v1 requirements across 3 phases
- `.planning/ROADMAP.md` — 3-phase coarse roadmap
- `.planning/research/RESEARCH.md` — Vercel AI SDK + Gemini research
- `.planning/codebase/` — 7 codebase map documents
- `.planning/phases/01-foundation/01-01-SUMMARY.md` — Plan 01-01 execution summary
