---
phase: 03-gabarito-ui
plan: "02"
subsystem: ui
tags: [react, tailwind, shadcn, details-summary, streaming, verbose-mode]

# Dependency graph
requires:
  - phase: 03-01
    provides: GabaritoGrid component, results page state (pageState, solvedAnswers, mode), skeleton streaming grid
provides:
  - QuestionCard expandable component using native HTML details/summary
  - Verbose mode explanations section wired below GabaritoGrid in page.tsx
  - End-to-end gabarito flow verified by human: upload HTML -> select mode -> see gabarito
affects: [future ui phases, any feature that extends the results view]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native HTML details/summary for zero-dependency collapsible UI"
    - "Tailwind group-open: variant for CSS-driven chevron rotation animation"
    - "Conditional section rendering with mode === 'verbose' guard"

key-files:
  created:
    - components/question-card.tsx
  modified:
    - app/page.tsx

key-decisions:
  - "Used native HTML details/summary for QuestionCard — semantic, accessible, zero-dependency, no state management needed"
  - "Chevron rotation via Tailwind group-open:rotate-180 — pure CSS, no JS event handlers"
  - "Cards sorted by questionIndex and rendered only when mode === 'verbose' and solvedAnswers.length > 0"
  - "Fallback explanation text 'Sem explicacao disponivel.' for answers with undefined explanation field"

patterns-established:
  - "QuestionCard: details/summary pattern for collapsible content in this codebase"
  - "Verbose guard: {mode === 'verbose' && ...} conditional wrapping verbose-only UI sections"

requirements-completed: [RESULT-02]

# Metrics
duration: ~45min
completed: 2026-04-03
---

# Phase 03 Plan 02: Verbose Mode Expandable Cards Summary

**Collapsible QuestionCard component (HTML details/summary) wired into results view — Verbose mode shows sorted explanation cards below the gabarito grid, No BS mode hides them entirely**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-03
- **Completed:** 2026-04-03
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint, approved)
- **Files modified:** 2

## Accomplishments

- Created `components/question-card.tsx` using native HTML `details`/`summary` — collapsed by default, no state management, accessible
- Wired verbose cards section in `app/page.tsx` below `GabaritoGrid` — sorted by questionIndex, hidden in No BS mode
- Full end-to-end flow verified by human: file upload, No BS mode grid, Verbose mode with expandable cards, reset flow, error handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create QuestionCard expandable component** - `4379f7d` (feat)
2. **Task 2: Wire verbose explanation cards into page.tsx** - `1b1bf84` (feat)
3. **Task 3: Human verification checkpoint** - approved (no code commit — checkpoint only)

**Checkpoint state commit:** `43be542` (docs: update STATE.md at checkpoint)

## Files Created/Modified

- `components/question-card.tsx` - Expandable card with question number, confidence-colored answer letter, explanation body; uses native HTML details/summary
- `app/page.tsx` - Added QuestionCard import and verbose explanations section below GabaritoGrid, guarded by `mode === "verbose"`

## Decisions Made

- Native `details`/`summary` chosen over shadcn Accordion — zero dependencies, semantic HTML, browser-native collapse behavior satisfies the requirement without added complexity
- Chevron rotation handled by `group-open:rotate-180` Tailwind utility — purely CSS driven, no React state needed
- Cards sorted by `questionIndex` before rendering to guarantee deterministic order regardless of stream arrival order
- `Sem explicacao disponivel.` fallback covers the case where No BS mode answers lack an explanation field

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 is now fully complete — both plans (03-01 GabaritoGrid, 03-02 QuestionCard) are done
- Full end-to-end flow verified: upload UNIP HTML -> select mode -> see gabarito with streaming grid
- v1 MVP milestone complete — all 19 requirements across 3 phases are implemented
- No blockers for any future enhancement work

## Self-Check: PASSED

- FOUND: .planning/phases/03-gabarito-ui/03-02-SUMMARY.md
- FOUND: components/question-card.tsx
- FOUND: commit 4fa8902 (QuestionCard component)
- FOUND: commit ce9ef4a (page.tsx wiring)
- FOUND: commit 78a3722 (docs/state update)

---
*Phase: 03-gabarito-ui*
*Completed: 2026-04-03*
