# Roadmap: Corretor UNIP

**Milestone:** v1 MVP
**Goal:** Given a UNIP test HTML page, parse every question client-side, send it to Gemini, and display a gabarito grid with correct answers — in a single frictionless flow.
**Created:** 2026-04-01

---

## Phases

- [ ] **Phase 1: Foundation** - Parser TypeScript port, HTML input UI, dependency install
- [ ] **Phase 2: LLM Integration** - /api/solve route, Zod schemas, Gemini streaming, modes
- [ ] **Phase 3: Gabarito UI** - Results page, grid display, verbose cards, loading/error states

## Phase Details

### Phase 1: Foundation
**Goal**: User can provide a UNIP test HTML (via file upload or paste), have it parsed client-side, and see a structured in-memory representation of all questions, options, and images — with all AI dependencies installed.
**Depends on**: Nothing (first phase)
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. User uploads a saved UNIP .html file and the app parses it without a page reload, producing N questions found
  2. User pastes raw HTML into the textarea and submits; same result as file upload
  3. A question with an embedded image produces a ParsedQuestion with a non-empty imageBase64 field
  4. An invalid or empty HTML submission shows a clear error message
**Plans**: 3 plans

Plans:
- [ ] 01-01: Install dependencies — Add ai@^6.0.0, @ai-sdk/google@^3.0.0, zod@^3.23.8 via pnpm; configure GOOGLE_GENERATIVE_AI_API_KEY in .env.local
- [x] 01-02: Port parser to TypeScript — Translate gabarito.js DOM-parsing logic into lib/parser.ts with image extraction
- [ ] 01-03: HTML input UI — Build app/page.tsx as interactive Client Component with file upload and paste textarea

### Phase 2: LLM Integration
**Goal**: Parsed questions are sent to Gemini via a streaming API route and return a validated, typed array of answers — with mode selection (No BS / Verbose) and thinkingBudget routing baked in.
**Depends on**: Phase 1
**Requirements**: SOLVE-01, SOLVE-02, SOLVE-03, SOLVE-04, SOLVE-05, MODE-01, MODE-02, MODE-03
**Success Criteria** (what must be TRUE):
  1. Submitting parsed questions sends a POST /api/solve request and receives a streamed response without hitting a timeout
  2. The response contains one answer object per question, each with a valid letter (A-E) and matching questionIndex
  3. Selecting "No BS" mode returns answers with no explanation field; "Verbose" returns answers with non-empty explanations
  4. A question containing an image causes the image to appear in the LLM payload and the answer reflects its content
  5. GOOGLE_GENERATIVE_AI_API_KEY is never present in any client-side bundle or network response
**Plans**: 2 plans

Plans:
- [ ] 02-01: Zod schemas and solve route — lib/schemas.ts + POST /api/solve using streamText + Output.array()
- [ ] 02-02: Modes and thinking routing — mode param wiring, prompt builder, thinkingBudget heuristic, mode selector UI

### Phase 3: Gabarito UI
**Goal**: Users see a complete gabarito grid the moment answers stream in, with expandable explanation cards in Verbose mode and clear loading and error feedback throughout.
**Depends on**: Phase 2
**Requirements**: RESULT-01, RESULT-02, RESULT-03, RESULT-04
**Success Criteria** (what must be TRUE):
  1. After submitting, a loading indicator appears and answer letters populate the grid one-by-one as they stream in
  2. In No BS mode, the completed grid shows every question number paired with its answer letter and nothing else
  3. In Verbose mode, each grid cell is expandable and reveals the explanation text
  4. If the API call fails, the user sees a non-generic error message with a suggestion to retry
  5. The full flow works end-to-end: upload UNIP HTML → select mode → see gabarito
**Plans**: 2 plans

Plans:
- [ ] 03-01: Results page and gabarito grid — app/gabarito/page.tsx with GabaritoGrid component, progressive streaming updates
- [ ] 03-02: Verbose cards, loading, and error states — QuestionCard expandable, streaming progress indicator, error boundaries

---

## Coverage Check

| Requirement | Phase |
|-------------|-------|
| INPUT-01 | 1 |
| INPUT-02 | 1 |
| INPUT-03 | 1 |
| INPUT-04 | 1 |
| INFRA-01 | 1 |
| INFRA-02 | 1 |
| INFRA-03 | 1 |
| SOLVE-01 | 2 |
| SOLVE-02 | 2 |
| SOLVE-03 | 2 |
| SOLVE-04 | 2 |
| SOLVE-05 | 2 |
| MODE-01 | 2 |
| MODE-02 | 2 |
| MODE-03 | 2 |
| RESULT-01 | 3 |
| RESULT-02 | 3 |
| RESULT-03 | 3 |
| RESULT-04 | 3 |

**v1 requirements:** 19 total mapped across 3 phases. No orphans.

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1 — Foundation | 0/3 | Not started | - |
| 2 — LLM Integration | 0/2 | Not started | - |
| 3 — Gabarito UI | 0/2 | Not started | - |

---
*Created: 2026-04-01*
