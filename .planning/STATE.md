# Project State

**Project:** Corretor UNIP
**Milestone:** v1 MVP
**Updated:** 2026-04-01

## Current Status

**Phase:** 1 — Foundation (in progress)
**Current Plan:** 01-02 complete
**Next action:** Continue with 01-03

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.
**Current focus:** Phase 1 — Foundation

## Phase Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Foundation | In progress (01-02 complete) | 3 plans |
| 2 — LLM Integration | Not started | 2 plans |
| 3 — Gabarito UI | Not started | 2 plans |

## Key Technical Context

- AI SDK 6: `streamText` + `Output.array()` — `generateObject` is deprecated
- LLM: `gemini-2.5-flash` with `thinkingBudget: 0` (recall) or `-1` (dynamic reasoning)
- Images: `{ type: 'image', image: base64String, mimeType: 'image/png' }` in message parts
- Streaming needed to avoid Vercel Hobby 10s timeout
- Packages: `ai@^6.0.0`, `@ai-sdk/google@^3.0.0`, `zod@^3.23.8`

## Artifacts

- `.planning/PROJECT.md` — project context and requirements
- `.planning/REQUIREMENTS.md` — 19 v1 requirements across 3 phases
- `.planning/ROADMAP.md` — 3-phase coarse roadmap
- `.planning/research/RESEARCH.md` — Vercel AI SDK + Gemini research
- `.planning/codebase/` — 7 codebase map documents
- `lib/parser.ts` — parseHTML function (Plan 01-02)
- `lib/schemas.ts` — Zod types ParsedQuestion/ParsedOption/SolveRequest/SolvedAnswer (Plan 01-02)
- `lib/parser.test.ts` — 6 vitest unit tests (Plan 01-02)
- `vitest.config.ts` — Vitest jsdom config (Plan 01-02)

## Key Decisions

| Decision | Plan | Rationale |
|----------|------|-----------|
| lib/schemas.ts created in Plan 01-02 with full Zod types | 01-02 | Plan 01-01 ran in parallel; zod not available at typecheck time — installed here to unblock |
| vitest + jsdom installed as devDependencies | 01-02 | Required for DOMParser in test environment; not in original package.json |
