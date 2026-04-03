---
phase: 02-llm-integration
verified: 2026-04-02T00:00:00Z
status: gaps_found
score: 6/8 must-haves verified
re_verification: false
gaps:
  - truth: "Parsed answers from the streaming response are stored or forwarded for UI consumption"
    status: failed
    reason: "handleSubmit calls POST /api/solve and reads the full stream text, but discards the result — it is only passed to devLog. No state variable holds the parsed answers for Phase 3 or any downstream consumer. The page remains on the loading screen forever after a successful call."
    artifacts:
      - path: "app/page.tsx"
        issue: "response.text() result stored in local `text` variable, then devLog'd and discarded. No setState call, no navigation, no data passed to a results view. The loading state is never exited on success."
    missing:
      - "Store parsed ndjson lines in a state variable (e.g. setSolvedAnswers) so Phase 3 can render them, OR navigate to a results route — the phase goal requires the pipeline to return a validated array of answers, not merely fire-and-forget"
      - "Exit loading state on success (setPageState back to a results state or navigate away)"

  - truth: "SOLVE-04 — thinkingBudget routing is mode-aware with 0 for no-bs and -1 for verbose"
    status: failed
    reason: "thinkingBudget routing exists in route.ts at line 55. However REQUIREMENTS.md definition of SOLVE-04 specifies: 'detection via a lightweight classifier prompt or heuristic' for routing between 0 and -1 per-question. The implemented routing is coarse-grained (whole-request, mode-driven), which satisfies the spirit but the REQUIREMENTS.md also marks this [ ] incomplete. Verified as implemented per 02-02-PLAN.md specification; flagged because REQUIREMENTS.md still marks it incomplete and the classifier-per-question sub-requirement is not present."
    artifacts:
      - path: "app/api/solve/route.ts"
        issue: "thinkingBudget routing present and correctly wired (mode === 'no-bs' ? 0 : -1), but REQUIREMENTS.md still marks SOLVE-04 as [ ] — the requirements file was not updated to reflect completion"
    missing:
      - "Update REQUIREMENTS.md to mark SOLVE-04 as [x] complete (implementation matches 02-02-PLAN spec)"
      - "Optionally: decide whether per-question heuristic routing is still required, or close SOLVE-04 as satisfied by the mode-level routing"
---

# Phase 2: LLM Integration Verification Report

**Phase Goal:** Parsed questions are sent to Gemini via a streaming API route and return a validated, typed array of answers — with mode selection (No BS / Verbose) and thinkingBudget routing baked in.
**Verified:** 2026-04-02
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Parsed questions are sent in a single POST to /api/solve | VERIFIED | `app/page.tsx` line 114: `fetch("/api/solve", { method: "POST", body: JSON.stringify({ mode, questions }) })` |
| 2 | API route uses streamText + Output.array() with Zod-validated schema | VERIFIED | `route.ts` lines 49-51: `streamText({ output: Output.array({ element: solvedAnswerSchema }) })` |
| 3 | Response is structured per-question: questionIndex, answer, confidence, explanation? | VERIFIED | `lib/schemas.ts` lines 20-29: `solvedAnswerSchema` with all four fields; `explanation` optional for no-bs mode |
| 4 | Streaming is used so partial results arrive progressively | VERIFIED | `route.ts` lines 64-76: `elementStream` piped to `ReadableStream`, emitting ndjson per answer; `Content-Type: application/x-ndjson` |
| 5 | No BS mode: thinkingBudget 0, prompt requests answer letters only | VERIFIED | `route.ts` line 55: `thinkingBudget: mode === "no-bs" ? 0 : -1`; `prompts.ts` lines 7-8: no-bs instruction excludes explanations |
| 6 | Verbose mode: thinkingBudget -1, prompt requests letter + explanation | VERIFIED | Same line 55 for budget; `prompts.ts` lines 9-10: verbose instruction requests explanation per option |
| 7 | User can select mode before submitting; mode is sent with request | VERIFIED | `page.tsx` lines 228-244: mode toggle UI with aria-pressed; line 117: `JSON.stringify({ mode, questions })` includes mode |
| 8 | Streaming response data reaches a consumer (state, navigation, or downstream component) | FAILED | `page.tsx` lines 127-133: stream read via `response.text()`, result devLog'd only, then discarded — no state set, loading screen never exits on success |

**Score:** 7/8 truths verified (Truth 8 failed; SOLVE-04 has a requirements-tracking gap noted separately)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/schemas.ts` | solvedAnswerSchema with questionIndex, answer, explanation | VERIFIED | All fields present; also includes `confidence` field added beyond spec |
| `app/api/solve/route.ts` | POST handler, streamText + Output.array, thinkingBudget routing | VERIFIED | All three present and correctly wired |
| `lib/prompts.ts` | buildPrompt(questions, mode) mode-aware prompt | VERIFIED | Exported, used in route.ts, mode branches produce distinct instruction text |
| `app/page.tsx` | handleSubmit calling fetch /api/solve with mode + questions | VERIFIED (partial) | Fetch call is wired; response is consumed but result is discarded (loading state never exits on success) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/page.tsx` | `app/api/solve/route.ts` | `fetch("/api/solve", { method: "POST", body: JSON.stringify({ mode, questions }) })` | WIRED | Line 114-118 |
| `app/api/solve/route.ts` | `lib/prompts.ts` | `import { buildPrompt }` + `buildPrompt(questions, mode)` | WIRED | Line 5 import, line 28 usage |
| `app/api/solve/route.ts` | `@ai-sdk/google` | `thinkingBudget: mode === "no-bs" ? 0 : -1` in `providerOptions.google.thinkingConfig` | WIRED | Line 52-58 |
| `app/page.tsx` | result consumer | Parsed answers stored in state or navigated to results page | NOT WIRED | `response.text()` result discarded; no setState, no navigation on success path |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/api/solve/route.ts` | `result.elementStream` | `streamText()` → Gemini → `Output.array()` | Yes — real LLM call, Zod-validated per element | FLOWING |
| `app/page.tsx` | `text` (local var) | `response.text()` reads full ndjson stream | Reaches the variable, but variable is devLog'd and immediately goes out of scope | HOLLOW — data received but not stored or forwarded |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — verifying requires a live Gemini API key and running Next.js server. Route structure and wiring verified statically.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SOLVE-01 | 02-01 | Single batch POST to /api/solve | SATISFIED | page.tsx line 114-118 |
| SOLVE-02 | 02-01 | generateText + Output.array() (AI SDK 6) | SATISFIED | route.ts line 49-51; `streamText` used (not `generateText` — `streamText` is the streaming equivalent, same SDK pattern) |
| SOLVE-03 | 02-01 | { number, answer, explanation? } per question | SATISFIED | schemas.ts solvedAnswerSchema; uses `questionIndex` not `number` — functional difference but consistent with plan spec in 02-01-PLAN.md task 1 |
| SOLVE-04 | 02-02 | thinkingBudget routing 0/-1 | PARTIALLY SATISFIED | Implementation matches 02-02 plan spec (mode-level routing); REQUIREMENTS.md still marks as [ ] incomplete; per-question classifier not implemented |
| SOLVE-05 | 02-01 | Streaming to avoid 10s timeout | SATISFIED | elementStream + ReadableStream ndjson; maxDuration = 60 |
| MODE-01 | 02-02 | No BS prompt: answer-only | SATISFIED | prompts.ts line 7-8 |
| MODE-02 | 02-02 | Verbose prompt: letter + explanation | SATISFIED | prompts.ts line 9-10 |
| MODE-03 | 02-02 | User selects mode, sent with request | SATISFIED | page.tsx mode toggle + JSON.stringify({ mode, questions }) |

**SOLVE-02 note:** REQUIREMENTS.md says `generateText` but the AI SDK 6 streaming equivalent is `streamText` — this is consistent with SOLVE-05 (streaming required) and is the correct implementation. Not a gap.

**SOLVE-03 note:** Field is `questionIndex` (0-based) not `number` — consistent with plan task 1 spec and the UI plan in Phase 3 which must account for this.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/page.tsx` | 127-133 | Stream response consumed via `response.text()`, result immediately discarded (devLog only), loading state never exits on success | Blocker | User submits the form, sees "Analisando questões..." loading screen, and is stuck there permanently after a successful API call. The answers are received but thrown away. |
| `app/page.tsx` | 130-131 | Comment "Phase 3 will implement progressive streaming UI" with no state handoff | Warning | Documented intentional stub for progressive streaming — acceptable. But there is no state bridge (no `setSolvedAnswers`) that Phase 3 can hook into without modifying this function again. |

---

## Human Verification Required

### 1. thinkingBudget: 0 behavior on gemini-2.5-flash

**Test:** Submit a simple factual question with mode "No BS" and observe the Gemini response time and token usage compared to Verbose mode.
**Expected:** No BS mode returns faster with no thinking tokens; Verbose mode may show longer latency due to dynamic reasoning.
**Why human:** Cannot test Gemini provider behavior without a live API call and key.

### 2. Image base64 multimodal handling

**Test:** Upload a UNIP HTML page containing a question with an embedded image; submit and verify Gemini receives and references the image.
**Expected:** Image part appended to content array; model acknowledges or correctly answers image-based question.
**Why human:** Requires a real UNIP HTML file with embedded images and live API call.

---

## Gaps Summary

**1 blocker gap, 1 requirements-tracking gap.**

**Blocker — response data discarded:** The phase goal says the pipeline should "return a validated, typed array of answers." The route produces that array (via `elementStream` + `Output.array()`), and the client receives it as ndjson bytes — but `app/page.tsx` reads those bytes into a local variable, logs them, and throws them away. No state update happens on success, and the loading screen never exits. The end-to-end pipeline fires but does not deliver. This is explicitly documented as a known stub in `02-02-SUMMARY.md` ("Phase 3 will replace this"), but it means the phase goal — returning answers to the user — is not yet achieved.

**Requirements tracking — SOLVE-04:** The implementation satisfies the 02-02-PLAN spec for thinkingBudget routing (mode-level: 0 vs -1). However, REQUIREMENTS.md marks SOLVE-04 as `[ ]` and its definition mentions "detection via a lightweight classifier prompt or heuristic" (per-question granularity). Either the requirement definition needs updating to match what was built, or per-question routing still needs to be added. This is a documentation/decision gap, not a functional regression.

The 6 other requirements (SOLVE-01, SOLVE-02, SOLVE-03, SOLVE-05, MODE-01, MODE-02, MODE-03 partial) are fully implemented and wired. The infrastructure (schemas, route, prompts module, mode selector UI) is production-quality — no stubs, no placeholders, correct types throughout.

---

_Verified: 2026-04-02_
_Verifier: Claude (gsd-verifier)_
