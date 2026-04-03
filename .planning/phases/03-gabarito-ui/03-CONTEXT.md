# Phase 3: Gabarito UI - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Display streaming LLM answers as a gabarito grid with progressive updates as answers arrive, verbose expandable explanation cards in Verbose mode, and clear loading/error states throughout. Everything lives on the existing single page — no route change.

</domain>

<decisions>
## Implementation Decisions

### Results Placement
- **D-01:** Results are shown inline on `app/page.tsx` — no navigation to `/gabarito` route. The form hides when results are shown; only the gabarito is visible in result state.
- **D-02:** A reset/back action (button) returns the user to the input form.

### Progressive Loading UX
- **D-03:** On submit, immediately switch to result view — show the full grid with all N question slots pre-allocated as skeleton cells. Do NOT use a full-page spinner.
- **D-04:** Pending (not-yet-answered) cells use an **animated pulse skeleton** (`animate-pulse` Tailwind) — muted background, clearly communicates loading in progress.
- **D-05:** Each cell fills in the moment its answer arrives from the ndjson stream. The counter "Gabarito (X/N)" updates progressively.

### Verbose Cards Layout
- **D-06:** In Verbose mode, an expandable card list appears **below the grid** — one card per question, sorted by question index.
- **D-07:** Each card shows: question number + answer letter in the header, explanation text in the collapsed body.
- **D-08:** Cards are **collapsed by default**. User clicks to expand individual cards.
- **D-09:** The explanations section is hidden entirely in No BS mode.

### Confidence Indicator
- **D-10:** The answer letter in each grid cell is **color-coded by confidence**:
  - `high` → primary color (current default)
  - `medium` → muted-foreground
  - `low` → amber/destructive (includes "could not be parsed" cases)
- **D-11:** Confidence color applies to the answer letter text only — the cell background stays consistent.

### Claude's Discretion
- Exact shadcn component choice for expandable cards (Accordion vs. Collapsible vs. custom)
- Whether to show a subtle spinner/progress bar alongside the grid during streaming
- Specific Tailwind classes for the confidence color tokens (map to existing CSS vars)
- How to handle the "nova prova" reset button visually

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Implementation
- `app/page.tsx` — Current page with inline grid, ndjson stream consumer, solvedAnswers state, and loading state. Downstream agents must read this to understand what already exists and avoid re-implementing it.
- `lib/schemas.ts` — SolvedAnswer schema: `{ questionIndex, answer, confidence, explanation? }`. Confidence type is `"high" | "medium" | "low"`.

### Phase Requirements
- `.planning/REQUIREMENTS.md` §Results — RESULT-01, RESULT-02, RESULT-03, RESULT-04

### Stack Reference
- `.planning/codebase/CONVENTIONS.md` — Tailwind v4 patterns, shadcn component usage, naming conventions
- `.planning/codebase/STACK.md` — shadcn/ui, Phosphor icons, Tailwind v4, Next.js 15 App Router

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card`, `CardContent` from `@/components/ui/card` — already used in page.tsx for upload area
- `Button` from `@/components/ui/button` — already used
- Phosphor icons (`CircleNotch`, `Warning`, etc.) — already in use

### Established Patterns
- `cn()` from `@/lib/utils` for class merging
- `"use client"` directive for all interactive pages
- Portuguese string literals for all user-facing text
- State management via `useState` in `app/page.tsx` — no external state library
- ndjson progressive parsing already implemented in `handleSubmit` (lines 93–124)
- `pageState: "input" | "loading"` controls current view — Phase 3 adds a `"results"` state

### Integration Points
- `solvedAnswers: SolvedAnswer[]` state already populated progressively — Phase 3 renders from this
- `parsedQuestions: ParsedQuestion[]` already set on submit — used to know total N for skeleton slots
- `isLoading: boolean` available for showing streaming-in-progress state

</code_context>

<specifics>
## Specific Ideas

- Grid skeleton: pre-allocate `parsedQuestions.length` cells, render each as pulse skeleton until the matching `solvedAnswers` entry exists
- Confidence colors map to existing Tailwind/CSS vars: high → `text-primary`, medium → `text-muted-foreground`, low → `text-amber-500` or `text-destructive`
- Verbose card section header: "Explicações" (Portuguese, consistent with existing UI strings)
- Reset button label: "Nova prova" or "Resolver outra prova"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-gabarito-ui*
*Context gathered: 2026-04-03*
