---
phase: "02-llm-integration"
plan: "02-03"
subsystem: "frontend-state"
tags: [solvedAnswers, ndjson, streaming, schemas, parser, shadcn]
dependency_graph:
  requires: []
  provides: [lib/schemas.ts, lib/parser.ts, app/page.tsx]
  affects: [app/page.tsx, lib/schemas.ts, lib/parser.ts]
tech_stack:
  added: [ai@6, "@ai-sdk/google@3", zod@3.23.8, shadcn/card, shadcn/textarea, shadcn/label, shadcn/separator]
  patterns: [ndjson streaming, Zod schema validation, React useState streaming accumulation]
key_files:
  created: [lib/schemas.ts, lib/parser.ts, components/ui/card.tsx, components/ui/textarea.tsx, components/ui/label.tsx, components/ui/separator.tsx]
  modified: [app/page.tsx, package.json, pnpm-lock.yaml, .planning/REQUIREMENTS.md]
decisions:
  - "Used separate isLoading boolean alongside pageState to avoid TypeScript narrowing false-positive on disabled prop"
  - "SolvedAnswer Zod schema validates answer as /^[A-E]$/ — malformed lines are silently skipped"
  - "Inline gabarito grid rendered in page.tsx for now; Phase 3 will extract to dedicated GabaritoGrid component"
metrics:
  duration: "~10 min"
  completed: "2026-04-02"
  tasks_completed: 1
  files_changed: 9
---

# Phase 02 Plan 03: Gap Closure — solvedAnswers State + NDJSON Streaming Summary

**One-liner:** `solvedAnswers` state wired in `app/page.tsx` with per-line Zod-validated ndjson parsing; Zod schemas, parser, shadcn components, and AI SDK dependencies bootstrapped.

## What Was Built

This gap closure plan bootstrapped the missing foundational layer that prior Phase 1 and 2 plans had not yet executed, then added the `solvedAnswers` streaming integration on top.

### lib/schemas.ts

Zod schemas and TypeScript types for:
- `ParsedOption` — `{ letter, text }`
- `ParsedQuestion` — `{ number, text, options, imageBase64 }`
- `SolvedAnswer` — `{ questionIndex, answer (A-E), explanation? }`

### lib/parser.ts

Client-side UNIP HTML parser using `DOMParser`. Extracts questions from `li.liItem` elements, reading `.answerNumLabelSpan`/`.answerTextSpan` pairs for options and embedded `data:` image URLs as base64.

### app/page.tsx

Full `"use client"` input page with:
- File upload (click + drag-and-drop, `.html/.htm` only)
- Paste textarea
- Mode selector (No BS / Verbose) with `aria-pressed`
- `solvedAnswers: SolvedAnswer[]` state
- `handleSubmit` that POSTs to `/api/solve`, reads the response body as a `ReadableStream`, decodes ndjson line-by-line, validates each line with `SolvedAnswerSchema.parse()`, and calls `setSolvedAnswers(prev => [...prev, parsed])` incrementally
- Inline gabarito grid that populates as answers stream in
- Error state with `role="alert"`, loading spinner with `CircleNotch`

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install deps, create schemas, parser, shadcn components, build page.tsx with solvedAnswers + ndjson | aa85574 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript narrowing false-positive on `disabled` prop**
- **Found during:** Task 1 typecheck
- **Issue:** `pageState === "loading"` inside the `if (pageState === "loading") return` guard was narrowed to always-false by TypeScript
- **Fix:** Added separate `isLoading: boolean` state; used `disabled={isLoading}` on the submit button
- **Files modified:** `app/page.tsx`
- **Commit:** aa85574

## Known Stubs

None — `solvedAnswers` flows directly to the inline gabarito grid on the page. The grid is minimal (question index + answer letter) and will be replaced by the full `GabaritoGrid` component in Phase 3 plan 03-01.

## Self-Check: PASSED

- lib/schemas.ts: FOUND
- lib/parser.ts: FOUND
- app/page.tsx: FOUND (solvedAnswers state + setSolvedAnswers ndjson parsing confirmed)
- Commit aa85574: FOUND
- pnpm typecheck: exits 0
- pnpm build: exits 0
- REQUIREMENTS.md SOLVE-04: marked complete
