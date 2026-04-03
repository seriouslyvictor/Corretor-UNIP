# Project State

**Project:** Corretor UNIP
**Milestone:** v1 MVP
**Updated:** 2026-04-03

## Current Status

**Phase:** 01-foundation — complete
**Current Plan:** 3 / 3 complete (01-01, 01-02, 01-03 done)
**Next action:** Execute Plan 02-01 (Zod schemas and /api/solve route)

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.
**Current focus:** Phase 2 — LLM Integration

## Phase Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Foundation | Complete (3/3 done) | 3 plans |
| 2 — LLM Integration | Not started | 2 plans |
| 3 — Gabarito UI | Not started | 2 plans |

## Key Technical Context

- AI SDK 6: `streamText` + `Output.array()` — `generateObject` is deprecated
- LLM: `gemini-2.5-flash` with `thinkingBudget: 0` (recall) or `-1` (dynamic reasoning)
- Images: `{ type: 'image', image: base64String, mimeType: 'image/png' }` in message parts
- Streaming needed to avoid Vercel Hobby 10s timeout
- Packages: `ai@^6.0.0`, `@ai-sdk/google@^3.0.0`, `zod@^3.23.8`
- Parser selectors (confirmed on real UNIP pages): `div.takeQuestionDiv`, `h3.steptitle`, `legend.legend-visible`, `table.multiple-choice-table`, `td.multiple-choice-numbering`

## Decisions

| Phase-Plan | Decision | Rationale |
|------------|----------|-----------|
| 01-01 | ai@^6 (not v5) installed | AI SDK 6 uses streamText + Output.array(); generateObject deprecated |
| 01-01 | All AI/Zod packages in runtime dependencies | Used in API route at request time, not build-only |
| 01-01 | lib/schemas.ts as shared schema contract | Single source of truth for parser, UI, and API route types |
| 01-02 | vitest + jsdom installed as devDependencies | Required for DOMParser in test environment |
| 01-02 | Parser does not import .correctAnswerFlag | v2 solves questions, doesn't read existing answers |
| 01-03 | Switch component skipped | Mode selector uses two Button components per UI spec Component Map; Switch unnecessary |
| 01-03 | Parser selectors rewritten post-checkpoint | Plan 01-02 used review-page selectors from gabarito.js; real UNIP take-test pages use different DOM structure |

## Performance Metrics

| Phase-Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| 01-01 | 2min | 2 | 4 |
| 01-02 | ~3min | 1 (TDD) | 4 |
| 01-03 | ~2 days (incl. checkpoint + parser fix) | 3 | 7 |

## Artifacts

- `.planning/PROJECT.md` — project context and requirements
- `.planning/REQUIREMENTS.md` — 19 v1 requirements across 3 phases
- `.planning/ROADMAP.md` — 3-phase coarse roadmap
- `.planning/research/RESEARCH.md` — Vercel AI SDK + Gemini research
- `.planning/codebase/` — 7 codebase map documents
- `.planning/phases/01-foundation/01-01-SUMMARY.md` — Plan 01-01 execution summary
- `.planning/phases/01-foundation/01-02-SUMMARY.md` — Plan 01-02 execution summary
- `.planning/phases/01-foundation/01-03-SUMMARY.md` — Plan 01-03 execution summary
- `lib/schemas.ts` — Zod types: ParsedOption, ParsedQuestion, SolveRequest
- `lib/parser.ts` — parseHTML function (UNIP take-test DOM → ParsedQuestion[])
- `lib/parser.test.ts` — 12 Vitest unit tests (jsdom environment)
- `vitest.config.ts` — Vitest jsdom config
- `.env.local.example` — API key template (server-side only)
- `app/page.tsx` — Input page Client Component (file upload, paste, mode selector, submit)
- `components/ui/card.tsx` — shadcn Card
- `components/ui/textarea.tsx` — shadcn Textarea
- `components/ui/label.tsx` — shadcn Label
- `components/ui/separator.tsx` — shadcn Separator
