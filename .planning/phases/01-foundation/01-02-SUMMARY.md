---
plan: 01-02
phase: 01-foundation
subsystem: parser
tags: [parser, dom, typescript, tdd, vitest]
dependency_graph:
  requires: []
  provides: [lib/parser.ts, lib/schemas.ts, lib/parser.test.ts, vitest.config.ts]
  affects: [lib/parser.ts]
tech_stack:
  added: [vitest, jsdom, zod]
  patterns: [TDD red-green, DOMParser, Zod schema types]
key_files:
  created:
    - lib/parser.ts
    - lib/parser.test.ts
    - lib/schemas.ts
    - vitest.config.ts
  modified:
    - package.json
    - pnpm-lock.yaml
decisions:
  - Zod installed here (not waiting for Plan 01-01) to satisfy typecheck requirement
  - lib/schemas.ts created with full Zod schemas including SolveRequest/SolveResponse for Plan 01-01 compatibility
metrics:
  duration: 152s
  completed: 2026-04-02T15:06:43Z
  tasks_completed: 1
  files_modified: 6
---

# Phase 1 Plan 02: HTML Parser Summary

TypeScript parser module porting legacy gabarito.js DOM extraction to typed `parseHTML(rawHTML): ParsedQuestion[]` using DOMParser and Zod schemas, with 6-test Vitest suite in jsdom environment.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for parseHTML | 34bb81d | lib/parser.test.ts, lib/schemas.ts, vitest.config.ts, package.json |
| 1 (GREEN) | Implement parseHTML | bc380cf | lib/parser.ts, package.json (zod) |

## What Was Built

### lib/parser.ts

Exports `parseHTML(rawHTML: string): ParsedQuestion[]` that:
- Returns `[]` for empty/whitespace input without throwing
- Uses `new DOMParser()` to parse raw HTML string
- Selects `li.liItem` elements (each is a question container)
- Extracts question number from `h3` text via `/Pergunta\s+(\d+)/i`
- Extracts question text from `.vtbegenerated p` paragraphs, joined with newlines
- Extracts options from `.reviewQuestionsAnswerDiv` containing `.answerNumLabelSpan` (letter) and `.answerTextSpan` (text), stripping trailing dots
- Extracts embedded images from `.vtbegenerated img[src]` — for `data:` URIs, stores the base64 payload after the comma; for other URLs, stores src as-is
- Returns sorted array by question number

### lib/schemas.ts

Zod schemas and TypeScript types for the full data model:
- `ParsedOption` / `ParsedQuestion` — parser output types
- `SolveRequest` / `SolvedAnswer` / `SolveResponse` — API types for Plan 01-04

### lib/parser.test.ts

6 Vitest tests covering all specified behaviors:
1. Two questions extracted with correct numbers, text, options
2. HTML with no `li.liItem` returns empty array
3. Empty/whitespace string returns empty array
4. Data-URI image extracted as base64 payload
5. No image yields `imageBase64: null`
6. Option letters stripped of trailing dot

### vitest.config.ts

Vitest configured with `environment: "jsdom"` to provide `DOMParser` in test environment.

## Verification Results

```
Tests  6 passed (6)
pnpm typecheck  exit 0
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed zod and created lib/schemas.ts ahead of Plan 01-01**
- **Found during:** Task 1 (GREEN phase, typecheck step)
- **Issue:** Plan 01-01 (running in parallel) installs zod and creates schemas.ts. At typecheck time, neither was available, causing `Cannot find module 'zod'` error.
- **Fix:** Installed `zod@^3.25.76` as a dependency. Created `lib/schemas.ts` with the full schema set (matching the interface contract from the plan's Context section, plus SolveRequest/SolveResponse types for Plan 01-04 compatibility).
- **Files modified:** lib/schemas.ts, package.json, pnpm-lock.yaml
- **Commit:** 34bb81d (schemas.ts), bc380cf (zod in package.json)

## Known Stubs

None — `parseHTML` is fully implemented with real DOMParser logic.

## Self-Check: PASSED
