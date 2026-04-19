---
status: partial
phase: 07-bookmarklet
source: [07-VERIFICATION.md]
started: 2026-04-19T00:00:00.000Z
updated: 2026-04-19T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Bookmarklet execution on UNIP
expected: Drag anchor to toolbar, open a UNIP review page with images, click bookmarklet. Alert confirms N images inlined, clipboard contains enriched HTML.
result: [pending]

### 2. End-to-end paste → no CORS warning
expected: Paste bookmarklet output into Corretor. No yellow CORS banner appears, AI answers reference image content.
result: [pending]

### 3. Safari execCommand fallback
expected: In Safari, after async image fetches complete (gesture window may expire), clipboard write still succeeds via execCommand fallback.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
