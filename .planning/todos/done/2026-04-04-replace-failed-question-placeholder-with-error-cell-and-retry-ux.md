---
created: 2026-04-04T14:30:00.000Z
title: Replace failed-question placeholder with error cell and retry UX
area: ui
files:
  - app/api/solve/route.ts
  - components/gabarito-grid.tsx
  - app/page.tsx
---

## Problem

When a question fails (API exhausted all retries and fallbacks), the route emits a silent
low-confidence placeholder: `{ questionIndex: i, answer: "A", confidence: "low" }`.
This is actively misleading — "A" is displayed as a real answer in the gabarito grid, just
with a different color. The user has no way to know the answer is fabricated.

The correct behavior: a failed question should be visibly marked as an error, never
presented as a valid answer letter.

## Solution

### 1. API route — emit error marker instead of placeholder

In `app/api/solve/route.ts`, replace the silent fallback with an explicit error payload:

```ts
// instead of:
enqueue({ questionIndex: i, answer: "A" as const, confidence: "low" as const });

// emit:
enqueue({ questionIndex: i, __error: true, message: "Não foi possível obter resposta." });
```

### 2. Schemas — add error variant to the ndjson line type

`SolvedAnswer` stays as-is for successful answers. Add a discriminated union in the
client-side parsing so error lines are handled explicitly:

```ts
const solveErrorSchema = z.object({ questionIndex: z.number(), __error: z.literal(true), message: z.string() });
type SolveError = z.infer<typeof solveErrorSchema>;
```

### 3. GabaritoGrid — render error cells differently

Each grid cell needs a third state beyond skeleton/answer: **error**.

- Visual: show `?` or a warning icon instead of a letter; red/destructive color; distinct
  from the confidence-low amber
- On click/tap: expand inline (or tooltip/sheet) showing:
  - Question number
  - The question text (passed through from `parsedQuestions[questionIndex]`)
  - A link or copy button so the user can Google the question themselves

### 4. page.tsx — track error cells alongside solved answers

```ts
const [failedQuestions, setFailedQuestions] = useState<SolveError[]>([]);
```

Parse error lines in the ndjson loop and push to `failedQuestions`. Pass both
`solvedAnswers` and `failedQuestions` to GabaritoGrid.

### 5. Retry affordance (stretch)

On the error cell or in a summary below the grid, show a "Tentar novamente" button
scoped to only the failed question indices. Re-POST with just those questions and
merge the results into `solvedAnswers`.

## Key constraint

`parsedQuestions` is already in scope on the results page — question text and options are
available for the error cell expansion without an extra fetch.
