---
phase: 01-foundation
plan: "01-03"
subsystem: ui
tags: [input-page, file-upload, drag-drop, shadcn, client-component, parser-fix]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [input-ui, html-ingestion]
  affects: [02-01]
tech_stack:
  added: [shadcn/card, shadcn/textarea, shadcn/label, shadcn/separator]
  patterns: [client-component, controlled-input, file-reader-api, drag-drop]
key_files:
  created: []
  modified:
    - app/page.tsx
    - lib/parser.ts
    - lib/parser.test.ts
    - components/ui/card.tsx
    - components/ui/textarea.tsx
    - components/ui/label.tsx
    - components/ui/separator.tsx
decisions:
  - "Switch component skipped — mode selector uses two Button components per UI spec Component Map"
  - "Parser selectors rewritten post-checkpoint to match actual UNIP take-test page DOM"
metrics:
  duration: "~2 days (including checkpoint + parser fix session)"
  completed: "2026-04-03"
  tasks: 3
  files: 7
requirements_addressed: [INPUT-01, INPUT-02]
---

# Phase 1 Plan 03: HTML Input UI Summary

**One-liner:** Interactive input page with file upload drop zone, paste textarea, and No BS / Verbose mode selector — plus a post-checkpoint parser rewrite to match the actual UNIP take-test page DOM.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Install shadcn components | 18630a4 | components/ui/card.tsx, textarea.tsx, label.tsx, separator.tsx |
| 2 | Build input page | af1ef47 | app/page.tsx |
| 3 | Visual verification checkpoint | — | Human-verified (approved) |

## What Was Built

`app/page.tsx` is a `"use client"` Client Component implementing the full UI Design Contract:

- File upload drop zone (Card) — click to open file picker or drag-and-drop `.html`/`.htm` files; shows filename on selection; teal border + bg tint on drag-over
- Paste textarea (Textarea) — full HTML paste with `font-mono` styling, min 160px height
- Mode selector — two Buttons (No BS / Verbose) with `aria-pressed`, defaults to No BS
- Submit button — calls `parseHTML()` on click; transitions to loading state on success; shows Portuguese error on empty/invalid input
- Loading state — CircleNotch spinner with "Analisando questoes..." copy and parsed question count
- Error messages in Portuguese with `role="alert"`
- Keyboard-accessible upload card (`tabIndex={0}`, Enter/Space trigger)

Four shadcn components installed: `card`, `textarea`, `label`, `separator`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Post-checkpoint fix - Bug] Parser rewritten with correct UNIP DOM selectors**

- **Found during:** Human visual verification — file submitted but parser returned 0 questions
- **Issue:** Plan 01-02 was built using selectors from the old `gabarito.js` review-page DOM (`li.liItem`, `.answerNumLabelSpan`, etc.). The actual UNIP take-test pages use a completely different structure: `div.takeQuestionDiv`, `h3.steptitle`, `legend.legend-visible`, `table.multiple-choice-table`, `td.multiple-choice-numbering`
- **Fix:** `lib/parser.ts` rewritten with correct selectors; all 12 tests in `lib/parser.test.ts` updated and passing
- **Files modified:** `lib/parser.ts`, `lib/parser.test.ts`
- **Commits:** f022100 (parser fix), 92e2f62 (dev logging + question count on loading screen)

**2. [Rule 2 - Missing functionality] Dev logging and question count added to loading screen**

- **Found during:** Post-checkpoint parser debugging
- **Issue:** No visibility into parse results during development; loading screen gave no feedback on how many questions were found
- **Fix:** Added `devLog()` utility (tree-shaken in production) that logs file load and parse results to console; loading screen now shows "N questoes encontradas"
- **Files modified:** `app/page.tsx`
- **Commit:** 92e2f62

## Known Stubs

- `handleSubmit` in `app/page.tsx` transitions to loading state after parsing but does **not** call an API route — Phase 2 (Plan 02-01) will wire the POST `/api/solve` call. The loading state currently shows question count but never resolves. This is intentional; the stub is documented in an inline comment.

## Self-Check: PASSED

- `app/page.tsx` exists and starts with `"use client"` — FOUND
- `components/ui/card.tsx` exists — FOUND
- `components/ui/textarea.tsx` exists — FOUND
- `components/ui/label.tsx` exists — FOUND
- `components/ui/separator.tsx` exists — FOUND
- Commit af1ef47 exists — FOUND
- Commit 18630a4 exists — FOUND
- Commit f022100 exists — FOUND (parser fix)
- Commit 92e2f62 exists — FOUND (dev logging)
