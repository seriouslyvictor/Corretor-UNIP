# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## empty-question-text-in-solve-prompt — Parser silently produces empty question text for UNIP HTML variant without <p> wrapper
- **Date:** 2026-04-03
- **Error patterns:** empty question, empty text, question text not provided, vtbegenerated, parser, querySelectorAll, p wrapper, direct text node, label
- **Root cause:** UNIP's exam HTML has two structural variants inside `.vtbegenerated`. The working variant wraps text in `<p>` tags; the failing variant places text as a direct text node (with a comment node prefix). The parser used `querySelectorAll(".vtbegenerated p")` which returned nothing for the direct-text-node variant, silently producing empty strings for question text and options.
- **Fix:** In `lib/parser.ts`, added fallback logic: if `.vtbegenerated p` returns no elements, fall back to `.vtbegenerated` `textContent` directly. Same dual-path applied to option text extraction.
- **Files changed:** lib/parser.ts, lib/parser.test.ts
---
