# Milestone Archive: v1 MVP

**Archived:** 2026-04-04
**Status:** Complete
**Timeline:** 2026-04-01 → 2026-04-04
**Commits:** 53 | **Files:** 74 | **LOC:** +15,579

---

## Milestone Goal

Given a UNIP test HTML page, parse every question client-side, send it to Gemini, and display a gabarito grid with correct answers — in a single frictionless flow.

## Phases

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1 — Foundation | 3/3 | Complete | 2026-04-03 |
| 2 — LLM Integration | 2/2 | Complete | 2026-04-03 |
| 3 — Gabarito UI | 2/2 | Complete | 2026-04-04 |

---

## Phase Details

### Phase 1: Foundation
**Goal**: User can provide a UNIP test HTML (via file upload or paste), have it parsed client-side, and see a structured in-memory representation of all questions, options, and images — with all AI dependencies installed.
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INFRA-01, INFRA-02, INFRA-03

**Plans:**
- 01-01: Install dependencies — ai@6, @ai-sdk/google@3, zod@3; shared Zod schemas in lib/schemas.ts
- 01-02: Port parser to TypeScript — lib/parser.ts with jsdom Vitest suite (12 tests)
- 01-03: HTML input UI — app/page.tsx with file upload drop zone, paste textarea, mode selector; plus post-checkpoint parser rewrite with correct UNIP take-test DOM selectors

**Key decisions:**
- AI SDK 6 (`streamText + Output.array()`) — `generateObject` deprecated in v6
- Parser selectors rewritten post-checkpoint: `div.takeQuestionDiv`, `h3.steptitle`, `legend.legend-visible`, `table.multiple-choice-table`
- `lib/schemas.ts` as single source of truth for cross-layer types

---

### Phase 2: LLM Integration
**Goal**: Parsed questions are sent to Gemini via a streaming API route and return a validated, typed array of answers — with mode selection (No BS / Verbose) and thinkingBudget routing baked in.
**Requirements**: SOLVE-01, SOLVE-02, SOLVE-03, SOLVE-04, SOLVE-05, MODE-01, MODE-02, MODE-03

**Plans:**
- 02-01: Zod schemas and solve route — lib/schemas.ts + POST /api/solve using streamText + Output.array(); ndjson streaming via elementStream
- 02-02: Modes and thinking routing — mode param wiring, buildPrompt() in lib/prompts.ts, thinkingBudget heuristic (0=recall, -1=dynamic), mode selector UI
- 02-03 (gap): LLM complexity classifier — per-question routing via lightweight classifier prompt

**Key decisions:**
- `toDataStreamResponse()` not available in ai@6.0.145 — custom ReadableStream wrapping elementStream used instead
- `thinkingBudget: -1` for Verbose (dynamic reasoning), `thinkingBudget: 0` for No BS (pure recall)
- `buildPrompt(questions, mode)` isolated in lib/prompts.ts — route stays thin
- `SolvedAnswer`: `{ questionIndex, answer (A-E), confidence, explanation? }`

---

### Phase 3: Gabarito UI
**Goal**: Users see a complete gabarito grid the moment answers stream in, with expandable explanation cards in Verbose mode and clear loading and error feedback throughout.
**Requirements**: RESULT-01, RESULT-02, RESULT-03, RESULT-04

**Plans:**
- 03-01: GabaritoGrid component — skeleton cells (animate-pulse), confidence-colored letters, three-state page flow (input → streaming → complete), reset button, inline error display
- 03-02: QuestionCard expandable cards — native HTML `<details>/<summary>`, confidence-colored letter, explanation body; wired into results view guarded by `mode === "verbose"`

**Key decisions:**
- `PageState` is `input | results` (no separate loading state); `isLoading` boolean differentiates
- GabaritoGrid pre-allocates N cells from `parsedQuestions.length`; skeleton fills progressively
- Confidence colors on letter text only (high=text-primary, medium=text-muted-foreground, low=text-amber-500)
- QuestionCard uses native `<details>/<summary>` — semantic, accessible, zero-dependency
- Error shown inline in results view (no navigation back to input on failure)

---

## Accomplishments

1. TypeScript parser (`lib/parser.ts`) with correct UNIP take-test DOM selectors and 12-test Vitest suite
2. Shared Zod schemas (`lib/schemas.ts`) as cross-layer contract for parser/UI/API
3. Streaming `/api/solve` route via Vercel AI SDK — avoids Vercel Hobby 10s timeout
4. LLM routing: complexity classifier routes fact-recall vs reasoning questions
5. No BS / Verbose mode selector with mode-aware prompt builder
6. Gabarito results UI: progressive skeleton grid + expandable verbose cards

---
*Archived: 2026-04-04*
