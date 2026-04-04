# Requirements Archive: v1 MVP

**Archived:** 2026-04-04
**Status:** All requirements complete

---

## v1 Requirements

### Input

- [x] **INPUT-01**: User can upload a saved UNIP `.html` file and have it parsed client-side
  - *Validated in Phase 1 (01-03): file upload drop zone in app/page.tsx*
- [x] **INPUT-02**: User can paste raw HTML source into a textarea and have it parsed client-side
  - *Validated in Phase 1 (01-03): paste textarea in app/page.tsx*
- [x] **INPUT-03**: Parser extracts question number, question text, all answer options (letter + text), and embedded images from the UNIP DOM structure
  - *Validated in Phase 1 (01-02 + 01-03): lib/parser.ts with correct take-test selectors; 12-test suite*
  - *Note: DOM selectors differ from original spec — actual UNIP take-test page uses `div.takeQuestionDiv`, `h3.steptitle`, `table.multiple-choice-table`*
- [x] **INPUT-04**: Images within questions are extracted as base64 strings and included in the LLM payload
  - *Validated in Phase 1 (01-02): base64 extraction in parser; passed as image parts in Phase 2*

### Solving

- [x] **SOLVE-01**: Parsed questions are sent in a single batch POST request to `/api/solve`
  - *Validated in Phase 2 (02-01): handleSubmit in page.tsx POSTs all questions*
- [x] **SOLVE-02**: API route calls Google Gemini via Vercel AI SDK using `streamText` + `Output.array()`
  - *Validated in Phase 2 (02-01): `generateObject` is deprecated in AI SDK 6; `streamText + Output.array()` used*
- [x] **SOLVE-03**: Responses are structured per-question: `{ questionIndex, answer, confidence, explanation? }` validated with Zod
  - *Validated in Phase 2 (02-01): solvedAnswerSchema in lib/schemas.ts*
- [x] **SOLVE-04**: LLM routing via `thinkingBudget` on `gemini-2.5-flash` — `0` for fact-recall, `-1` (dynamic) for reasoning-heavy
  - *Validated in Phase 2 (02-02 + 02-03): complexity classifier routes per-question*
- [x] **SOLVE-05**: Streaming response used so partial results appear progressively
  - *Validated in Phase 2 (02-01): elementStream piped as ndjson; custom ReadableStream (toDataStreamResponse not in ai@6.0.145)*

### Modes

- [x] **MODE-01**: "No BS" mode — prompt instructs model to return only the correct letter, no explanation
  - *Validated in Phase 2 (02-02): buildPrompt() in lib/prompts.ts*
- [x] **MODE-02**: "Verbose" mode — prompt instructs model to return correct letter + brief explanation
  - *Validated in Phase 2 (02-02): buildPrompt() in lib/prompts.ts*
- [x] **MODE-03**: User can select mode before submitting; mode is sent with the request
  - *Validated in Phase 2 (02-02): mode selector in page.tsx; mode param in SolveRequest*

### Results

- [x] **RESULT-01**: Gabarito grid displays question number + answer letter for all questions simultaneously
  - *Validated in Phase 3 (03-01): GabaritoGrid with progressive streaming fill*
- [x] **RESULT-02**: Verbose mode shows expandable card per question with the explanation
  - *Validated in Phase 3 (03-02): QuestionCard with native details/summary*
- [x] **RESULT-03**: Loading state shown while LLM is processing (streaming progress preferred)
  - *Validated in Phase 3 (03-01): skeleton cells animate-pulse during streaming*
- [x] **RESULT-04**: Error state shown if API call fails, with actionable message
  - *Validated in Phase 3 (03-01): inline error in results view with retry suggestion*

### Infrastructure

- [x] **INFRA-01**: Vercel AI SDK (`ai@^6.0.0`, `@ai-sdk/google@^3.0.0`) installed and configured
  - *Validated in Phase 1 (01-01): ai@6.0.143, @ai-sdk/google@3.0.55 installed*
- [x] **INFRA-02**: `GOOGLE_GENERATIVE_AI_API_KEY` consumed from environment variables server-side only
  - *Validated in Phase 1 (01-01): .env.local.example; key read only in app/api/solve/route.ts*
- [x] **INFRA-03**: API key never exposed to the client
  - *Validated in Phase 1 (01-01) + Phase 2 (02-01): API route is server-only; no client bundle exposure*

---

## v2 Requirements (carried forward)

### Quality of Life
- **UX-01**: Toggle between No BS and Verbose mode after results (re-use cached parse, re-call API)
- **UX-02**: Copy gabarito to clipboard as plain text
- **UX-03**: Client-side image compression before base64 encoding

### Provider Flexibility
- **PROV-01**: UI option to select LLM provider (Gemini / Claude / OpenAI)
- **PROV-02**: Provider-specific model selector

### Deployment
- **DEPLOY-01**: Vercel production deployment with env var management
- **DEPLOY-02**: Vercel Pro `maxDuration = 60` for long tests

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database / persistence | MVP only — no user data stored, stateless per request |
| Authentication / user accounts | No login required; tool is single-user local use |
| URL-based HTML fetching | UNIP portal requires login; file upload avoids auth complexity |
| Multiple simultaneous LLM providers | Single provider per deploy; swap via import, not UI |
| Generating mock/practice tests | Out of scope for v1 solving tool |

---
*Requirements defined: 2026-04-01*
*Archived: 2026-04-04*
