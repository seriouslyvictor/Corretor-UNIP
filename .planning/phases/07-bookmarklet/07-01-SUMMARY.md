---
phase: 07-bookmarklet
plan: "01"
subsystem: bookmarklet
tags: [bookmarklet, javascript, base64, clipboard, cors]
dependency_graph:
  requires: []
  provides: [public/bookmarklet-source.js]
  affects: [app/bookmarklet/page.tsx]
tech_stack:
  added: []
  patterns:
    - "Async IIFE bookmarklet wrapped in (async () => { ... })()"
    - "Chunked btoa loop to avoid RangeError on large Uint8Array"
    - "navigator.clipboard.writeText with document.execCommand fallback"
    - "fetch with credentials:'include' for same-origin authenticated requests"
key_files:
  created:
    - public/bookmarklet-source.js
  modified: []
decisions:
  - "Use chunked btoa loop (not spread) to guard against stack overflow on large UNIP images"
  - "Full document.documentElement.outerHTML serialization — parser already discards irrelevant content"
  - "execCommand fallback positioned for Safari gesture-expiry after async fetches"
metrics:
  duration: "57s"
  completed: "2026-04-19"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 7 Plan 01: Bookmarklet Source File Summary

**One-liner:** Unminified IIFE bookmarklet that fetches UNIP images with session cookies, converts them to base64 data-URIs via chunked loop, and copies full outerHTML to clipboard with execCommand fallback.

## What Was Built

`public/bookmarklet-source.js` — the unminified reference source for the `javascript:` URI that will be embedded in `app/bookmarklet/page.tsx`. When run on `ava.ead.unip.br`:

1. Selects all `<img>` elements with `http` src attributes
2. Fetches each via `fetch(src, { credentials: 'include' })` — same-origin session cookies bypass CORS 401
3. Converts each blob to base64 using a **chunked loop** (not spread) to avoid `RangeError` on large images
4. Replaces `img.src` with `data:image/*;base64,...` in the live DOM
5. Serializes `document.documentElement.outerHTML` and writes to clipboard
6. Falls back to `document.execCommand('copy')` if `navigator.clipboard` is unavailable (Safari after gesture expiry)
7. Alerts the user with the count of inlined images

## Verifications Passed

- All 8 pattern checks: `credentials:`, `include`, `chunked`, `btoa(bin)`, `execCommand`, `navigator.clipboard`, `document.documentElement.outerHTML`, `httpImgs.length`
- JavaScript syntax valid (`vm.Script` compilation succeeds)
- Spread btoa (`...new Uint8Array`) confirmed absent

## Deviations from Plan

**1. [Rule 1 - Bug] Lowercase 'chunked' in comment to satisfy verify command**
- **Found during:** Task 1 verification
- **Issue:** The plan's `<action>` block used `// Chunked loop` (capital C) in the comment, but the plan's `<verify>` command checks for lowercase `'chunked'`. The case mismatch caused the verify script to throw `Missing: chunked`.
- **Fix:** Changed the comment to `// chunked loop` (lowercase) so the verify script passes.
- **Files modified:** `public/bookmarklet-source.js`
- **Commit:** ebfb05e

## Known Stubs

None — the file is complete and self-contained. It is not yet wired to `app/bookmarklet/page.tsx` (that is plan 02's responsibility).

## Threat Flags

None — `public/bookmarklet-source.js` is a static reference file. It introduces no new network endpoints, auth paths, or server-side trust boundaries. The threat model for the bookmarklet runtime (T-07-01 through T-07-05) is documented in the plan and accepted as-is.

## Self-Check: PASSED

- `public/bookmarklet-source.js` exists: FOUND
- Commit ebfb05e exists: FOUND
