# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1 — MVP

**Shipped:** 2026-04-04
**Timeline:** 2026-03-22 → 2026-04-04 (13 days)
**Phases:** 3 | **Plans:** 8 | **Commits:** 55

### What Was Built

- HTML input flow: file upload with drag-and-drop, paste textarea, client-side parser
- Streaming `/api/solve` route (Gemini 2.5 Flash, ndjson, avoids Vercel 10 s timeout)
- LLM complexity classifier routing per-question to fact-recall or reasoning model tier
- No BS / Verbose mode selector with mode-aware prompt builder
- Gabarito grid with progressive skeleton fill, confidence-colored letters, error cells + retry drawer

### What Worked

- **Shared schemas from day 1** — `lib/schemas.ts` as single source of truth prevented type drift across parser, API, and UI
- **Streaming architecture chosen early** — the ndjson streaming approach was designed for the Vercel 10 s timeout constraint upfront, avoiding a painful refactor
- **Client-side parsing** — keeping DOM parsing in the browser meant no CORS issues and no need to serialize raw HTML to the server
- **Native `<details>/<summary>`** — zero-dependency accessible disclosure pattern; didn't reach for a component library for something HTML already handles

### What Was Inefficient

- **Parser selector mismatch** — initial parser used review-page selectors (`div.questionDiv`) instead of take-test selectors (`div.takeQuestionDiv`); required post-checkpoint rewrite
- **AI SDK 6 learning curve** — `generateObject` deprecation discovery mid-phase caused rework; should have verified API surface before starting Phase 2
- **Post-milestone hardening** — rate-limiting defense (429 retry, full→lite fallback), model validation, and error cells with retry UX were added after the archive commit rather than being planned phases; reflects under-scoped hardening

### Patterns Established

- `lib/schemas.ts` as cross-layer contract — Zod schemas shared between parser output, API validation, and client state
- `lib/prompts.ts` as isolated prompt builder — route stays thin, prompts are testable in isolation
- Streaming POST → ndjson client consumption pattern with progressive state updates via `setSolvedAnswers((prev) => [...prev, parsed])`
- `thinkingBudget: 0` for pure recall, `thinkingBudget: -1` for dynamic reasoning

### Key Lessons

1. **Verify API surface before writing code** — check SDK docs/changelog before assuming method availability (would have avoided the `generateObject` → `streamText + Output.array()` pivot)
2. **Harden at planning time** — rate limits, model fallbacks, and error UX are table stakes for a streaming LLM app; plan them as explicit phases, not patches
3. **Prove DOM selectors on a real sample first** — the parser selector mismatch cost one full plan; keeping a fixture HTML file in the test suite would have caught it immediately

### Cost Observations

- Model mix: primarily Sonnet 4.x (planning + execution), Haiku for subagent classification
- Sessions: ~4 sessions over 13 days
- Notable: coarse granularity + yolo mode kept planning overhead low; the architecture was simple enough that deep research wasn't needed

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1 | ~4 | 3 | First milestone — baseline established |

### Cumulative Quality

| Milestone | Tests | Coverage | Notes |
|-----------|-------|----------|-------|
| v1 | 12 | parser only | Vitest suite for lib/parser.ts; UI untested |

### Top Lessons (Verified Across Milestones)

1. Verify SDK API surface before coding — avoid mid-phase pivots
2. Harden explicitly — rate limits and error UX belong in the plan, not the backlog
