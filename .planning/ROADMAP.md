# Roadmap: Corretor UNIP

**Milestone:** v1 MVP
**Goal:** Given a UNIP test HTML page, parse every question client-side, send it to Gemini, and display a gabarito grid with correct answers — in a single frictionless flow.
**Created:** 2026-04-01

---

## Phases

- [ ] **Phase 1 — Foundation** — Parser TypeScript port, HTML input UI, dependency install
- [ ] **Phase 2 — LLM Integration** — `/api/solve` route, Zod schemas, Gemini streaming, modes
- [ ] **Phase 3 — Gabarito UI** — Results page, grid display, verbose cards, loading/error states

---

## Phase Details

### Phase 1 — Foundation

**Goal:** User can provide a UNIP test HTML (via file upload or paste), have it parsed client-side, and see a structured in-memory representation of all questions, options, and images — with all AI dependencies installed.
**Requires:** none

### Plans
1. **Install dependencies** — Add `ai@^6.0.0`, `@ai-sdk/google@^3.0.0`, `zod@^3.23.8` via pnpm; configure `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`; ensure key is server-only
2. **Port parser to TypeScript** — Translate `gabarito.js` DOM-parsing logic into `lib/parser.ts`; extract question number, text, answer options (letter + text), and embedded images as base64 strings; cover both `<img>` and CSS background-image cases
3. **HTML input UI** — Build `app/page.tsx` as an interactive Client Component with file upload (`<input type="file">`) and paste textarea; on submit, run parser and emit structured `ParsedQuestion[]` to state; show parse error if no questions found

### UAT
- [ ] User uploads a saved UNIP `.html` file; the app parses it without a page reload and logs (or briefly displays) N questions found
- [ ] User pastes raw HTML into the textarea and submits; same result as file upload
- [ ] A question with an embedded image produces a `ParsedQuestion` with a non-empty `imageBase64` field
- [ ] An invalid or empty HTML submission shows a clear error message

### Requirements Covered
INPUT-01, INPUT-02, INPUT-03, INPUT-04, INFRA-01, INFRA-02, INFRA-03

---

### Phase 2 — LLM Integration

**Goal:** Parsed questions are sent to Gemini via a streaming API route and return a validated, typed array of answers — with mode selection (No BS / Verbose) and thinkingBudget routing baked in.
**Requires:** Phase 1

### Plans
1. **Zod schemas and solve route** — Define `answerSchema` in `lib/schemas.ts` (`{ questionIndex, answer, explanation? }` validated with Zod); implement `POST /api/solve` in `app/api/solve/route.ts` using `streamText` + `Output.array({ element: answerSchema })`; build `buildMessages()` to assemble text + image content parts correctly (`mimeType` not `mediaType`)
2. **Modes and thinking routing** — Wire `mode` param (`"nobs"` | `"verbose"`) from request body into prompt builder; adjust system prompt for No BS (letter only) vs Verbose (letter + explanation); apply `thinkingBudget: 0` for fact-recall questions and `thinkingBudget: -1` (dynamic) for reasoning-heavy questions using a lightweight heuristic or classifier; expose mode selector UI on the input page before submit

### UAT
- [ ] Submitting parsed questions to the app sends a `POST /api/solve` request and receives a streamed response without hitting a timeout
- [ ] The response contains one answer object per question, each with a valid letter (`A`–`E`) and matching `questionIndex`
- [ ] Selecting "No BS" mode returns answers with no `explanation` field; selecting "Verbose" returns answers with non-empty `explanation` strings
- [ ] A question containing an image causes the image to appear in the LLM payload and the answer reflects its content
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` is never present in any client-side bundle or network response

### Requirements Covered
SOLVE-01, SOLVE-02, SOLVE-03, SOLVE-04, SOLVE-05, MODE-01, MODE-02, MODE-03

---

### Phase 3 — Gabarito UI

**Goal:** Users see a complete gabarito grid the moment answers stream in, with expandable explanation cards in Verbose mode and clear loading and error feedback throughout.
**Requires:** Phase 2

### Plans
1. **Results page and gabarito grid** — Build `app/gabarito/page.tsx` (or inline on `app/page.tsx` as a second view state); render `GabaritoGrid` component showing question number + answer letter for all questions simultaneously; update grid progressively as `elementStream` emits completed answer objects
2. **Verbose cards, loading, and error states** — In Verbose mode, render an expandable `QuestionCard` per question showing the explanation; display a streaming progress indicator while LLM is processing (e.g., answered N/total); show an actionable error message if the API call fails (network error, structured output parse failure, Gemini quota exceeded)

### UAT
- [ ] After submitting, a loading indicator appears immediately and question answer letters populate the grid one-by-one as they arrive from the stream
- [ ] In No BS mode, the completed grid shows every question number paired with its answer letter and nothing else
- [ ] In Verbose mode, each grid cell (or card below the grid) is expandable and reveals the explanation text
- [ ] If the API call fails, the user sees a non-generic error message with a suggestion to retry
- [ ] The full flow works end-to-end: upload UNIP HTML → select mode → see gabarito

### Requirements Covered
RESULT-01, RESULT-02, RESULT-03, RESULT-04

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
