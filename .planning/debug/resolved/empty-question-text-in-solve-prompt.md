---
status: resolved
trigger: "empty-question-text-in-solve-prompt"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED — Q1/Q4/Q5 have question text as a direct text node inside .vtbegenerated (no <p> wrapper). Options also lack <p> wrappers (text is directly in <label>). The parser only queried .vtbegenerated p, which matched nothing for these questions.
test: Added FIXTURE_NO_P_WRAPPER test to parser.test.ts simulating the real Q1/Q4/Q5 structure.
expecting: parseHTML returns non-empty text and options for questions using direct text nodes in .vtbegenerated.
next_action: Human verification — run solve on real exam, confirm Q1/Q4/Q5 now return actual question text and options.

## Symptoms

expected: Each question prompt should contain the full question text and answer choices before being sent to the LLM API.
actual: Questions 9 and 10 (of 10) had empty question bodies in the prompt — "Question 9:\n\n" with no text. The LLM responded with a random guess and noted "The question text was not provided in the prompt."
errors: No runtime errors thrown. The LLM itself flagged the problem in its explanation field.
reproduction: Run the solve feature on a 10-question exam. Last questions (at least Q9 and Q10) arrive with empty text.
timeline: Observed in testing. Original parsed data is no longer available.

## Eliminated

- hypothesis: parsedQuestionSchema.text should use .min(1) to guard against empty questions
  evidence: Rejecting at schema level causes a 400 for the entire request when any question has empty text. The correct behavior is to pass empty-text questions through schema validation and let the per-question guard in the API route emit a structured "could not be parsed" result for them individually.
  timestamp: 2026-04-03T00:02:00Z

- hypothesis: Question text lost in NDJSON streaming/decoding
  evidence: The solve log shows the PROMPT itself has empty text ("Question 9:\n\n") — the problem is upstream of the API call, in the data passed to buildSinglePrompt.
  timestamp: 2026-04-03T00:00:00Z

- hypothesis: API route silently truncates the questions array
  evidence: Log shows Q9/10 ARE iterated (we see the Q9/10 log header); the problem is that question.text is empty, not that questions are missing.
  timestamp: 2026-04-03T00:00:00Z

## Evidence

- timestamp: 2026-04-03T00:00:00Z
  checked: lib/schemas.ts — parsedQuestionSchema
  found: text field is `z.string()` with no `.min(1)` constraint. An empty string passes validation silently.
  implication: The schema is the first missing guard — empty text is never rejected.

- timestamp: 2026-04-03T00:00:00Z
  checked: lib/parser.ts — text extraction logic
  found: Text is extracted via `legend.querySelectorAll(".vtbegenerated p")`. Only `<p>` elements directly under `.vtbegenerated` are matched. Option text uses `td:last-child .vtbegenerated p`. If question stems in real UNIP HTML for some questions use a different wrapper (e.g., `<label>` inside vtbegenerated, or a nested div), those paragraphs are still matched by `querySelectorAll` (it searches all descendants). However if the content sits outside `.vtbegenerated` entirely, or the legend selector misses (e.g., the legend element uses a different class or is absent), `text` will be empty.
  implication: Parser can silently produce empty text with no error if the HTML structure deviates for certain questions.

- timestamp: 2026-04-03T00:00:00Z
  checked: lib/prompts.ts — buildSinglePrompt
  found: No guard on `question.text`. An empty string produces "Question N:\n\n" exactly matching the observed log output.
  implication: Prompt builder is a pass-through — it will produce malformed prompts silently.

- timestamp: 2026-04-03T00:00:00Z
  checked: app/api/solve/route.ts — question iteration loop
  found: No guard before `buildSinglePrompt` or before `generateObject`. Empty-text questions proceed to the LLM API unconditionally.
  implication: The API is the right place to add the guard — it's the last defense before the API call.

- timestamp: 2026-04-03T00:00:00Z
  checked: app/page.tsx — handleSubmit
  found: `parseHTML` result is sent directly as `body.questions` to the API. No client-side validation of individual question.text fields.
  implication: Client is not a blocker here; server-side guard is the right fix location.

- timestamp: 2026-04-03T00:03:00Z
  checked: view-source HTML file for the real exam — compared Q1/Q4/Q5 vs Q2/Q3/Q6-Q10 DOM structure
  found: Q1/Q4/Q5 use `<div class="vtbegenerated"><!--RsQ_NNN-->text directly</div>` (no <p> wrapper). Q2/Q3/Q6-Q10 use `<div class="vtbegenerated"><p>text</p></div>`. Same pattern in options: Q1/Q4/Q5 use `<label>text</label>` directly (no <p>), others use `<label><p>text</p></label>`.
  implication: UNIP generates two HTML variants for question content. The parser must handle both.

## Resolution

root_cause: UNIP's exam HTML has two structural variants for question content inside .vtbegenerated:
  1. (Working) Text wrapped in <p>: <div class="vtbegenerated"><p>text</p></div>
  2. (Failing) Text as direct text node: <div class="vtbegenerated"><!--RsQ_NNN-->text</div>
  The parser used `legend.querySelectorAll(".vtbegenerated p")` which only matched variant 1. For variant 2 (Q1/Q4/Q5), zero <p> elements were found and text was set to empty string. The same mismatch applied to option text: variant 2 uses <label>text</label> directly (no <p>), so the selector `td:last-child .vtbegenerated p` returned null and options were silently skipped.

fix:
  In `lib/parser.ts`:
  1. Question text extraction: if .vtbegenerated p returns no elements, fall back to .vtbegenerated textContent directly.
  2. Option text extraction: replaced single querySelector for <p> with: find .vtbegenerated in the cell, then use querySelector("p") if present, else fall back to .vtbegenerated textContent itself.
  All 19 vitest tests pass including a new FIXTURE_NO_P_WRAPPER test that reproduces the Q1/Q4/Q5 structure.

verification: Tests pass (19/19 vitest). Human confirmed on real exam — all questions now parsed and answered correctly, no empty question text.
files_changed:
  - lib/schemas.ts (prior session — reverted .min(1))
  - lib/parser.ts (this session — dual-variant text extraction)
  - lib/parser.test.ts (this session — added no-p-wrapper fixture and test)
