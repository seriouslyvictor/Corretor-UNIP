# Requirements: Corretor UNIP

**Defined:** 2026-04-01
**Core Value:** Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.

## v1 Requirements

### Input

- [ ] **INPUT-01**: User can upload a saved UNIP `.html` file and have it parsed client-side
- [ ] **INPUT-02**: User can paste raw HTML source into a textarea and have it parsed client-side
- [x] **INPUT-03**: Parser extracts question number, question text, all answer options (letter + text), and embedded images from the UNIP DOM structure (`li.liItem`, `.vtbegenerated p`, `.answerNumLabelSpan`, `.answerTextSpan`)
- [x] **INPUT-04**: Images within questions are extracted as base64 strings and included in the LLM payload

### Solving

- [ ] **SOLVE-01**: Parsed questions are sent in a single batch POST request to `/api/solve`
- [ ] **SOLVE-02**: API route calls Google Gemini via Vercel AI SDK using `generateText` + `Output.array()` (AI SDK 6 pattern — `generateObject` is deprecated)
- [ ] **SOLVE-03**: Responses are structured per-question: `{ number, answer, explanation? }` validated with Zod
- [ ] **SOLVE-04**: LLM routing via `thinkingBudget` on `gemini-2.5-flash` — `0` for fact-recall questions, `-1` (dynamic) for reasoning-heavy questions; detection via a lightweight classifier prompt or heuristic
- [ ] **SOLVE-05**: Streaming response used so partial results appear progressively (avoids Vercel Hobby 10s timeout)

### Modes

- [ ] **MODE-01**: "No BS" mode — prompt instructs model to return only the correct letter, no explanation
- [ ] **MODE-02**: "Verbose" mode — prompt instructs model to return correct letter + brief explanation of why each option is right or wrong
- [ ] **MODE-03**: User can select mode before submitting; mode is sent with the request

### Results

- [ ] **RESULT-01**: Gabarito grid displays question number + answer letter for all questions simultaneously
- [ ] **RESULT-02**: Verbose mode shows expandable card per question with the explanation
- [ ] **RESULT-03**: Loading state shown while LLM is processing (streaming progress preferred)
- [ ] **RESULT-04**: Error state shown if API call fails, with actionable message

### Infrastructure

- [x] **INFRA-01**: Vercel AI SDK (`ai@^6.0.0`, `@ai-sdk/google@^3.0.0`) installed and configured
- [x] **INFRA-02**: `GOOGLE_GENERATIVE_AI_API_KEY` consumed from environment variables server-side only
- [x] **INFRA-03**: API key never exposed to the client

## v2 Requirements

### Quality of Life

- **UX-01**: Toggle between No BS and Verbose mode after results are shown (re-use cached parse, re-call API)
- **UX-02**: Copy gabarito to clipboard as plain text
- **UX-03**: Client-side image compression before base64 encoding (reduces payload size for image-heavy tests)

### Provider Flexibility

- **PROV-01**: UI option to select LLM provider (Gemini / Claude / OpenAI) — single import swap already architected
- **PROV-02**: Provider-specific model selector (e.g., gemini-2.5-pro for harder tests)

### Deployment

- **DEPLOY-01**: Vercel production deployment with env var management
- **DEPLOY-02**: Vercel Pro `maxDuration = 60` for long tests (workaround for 10s Hobby timeout)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database / persistence | MVP only — no user data stored, stateless per request |
| Authentication / user accounts | No login required; tool is single-user local use |
| URL-based HTML fetching | UNIP portal requires login; file upload avoids auth complexity |
| Multiple simultaneous LLM providers | Single provider per deploy; swap via import, not UI |
| Generating mock/practice tests | Out of scope for v1 solving tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01, INPUT-02 | Phase 1 | Pending |
| INPUT-03, INPUT-04 | Phase 1 | Pending |
| INFRA-01, INFRA-02, INFRA-03 | Phase 1 | Complete (01-01) |
| SOLVE-01, SOLVE-02, SOLVE-03 | Phase 2 | Pending |
| SOLVE-04, SOLVE-05 | Phase 2 | Pending |
| MODE-01, MODE-02, MODE-03 | Phase 2 | Pending |
| RESULT-01, RESULT-02 | Phase 3 | Pending |
| RESULT-03, RESULT-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after initialization*
