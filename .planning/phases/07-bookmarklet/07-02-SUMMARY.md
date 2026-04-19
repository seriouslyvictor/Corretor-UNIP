---
phase: 07-bookmarklet
plan: "02"
subsystem: bookmarklet
tags: [bookmarklet, next.js, server-component, instructions-page, drag-anchor]
dependency_graph:
  requires: [public/bookmarklet-source.js]
  provides: [app/bookmarklet/page.tsx, app/bookmarklet/BookmarkletAnchor.tsx]
  affects: [/bookmarklet route]
tech_stack:
  added: []
  patterns:
    - "Server Component page with extracted Client Component anchor for onClick handler"
    - "javascript: URI as compile-time constant in BOOKMARKLET_HREF"
    - "eslint-disable-next-line for @next/next/no-html-link-for-pages on javascript: href"
    - "draggable={true} for cross-browser drag-to-toolbar support"
key_files:
  created:
    - app/bookmarklet/page.tsx
    - app/bookmarklet/BookmarkletAnchor.tsx
  modified: []
decisions:
  - "Extracted BookmarkletAnchor as Client Component — Next.js 16 App Router forbids onClick in Server Components during prerender"
  - "BOOKMARKLET_HREF is a compile-time constant, no dynamic data flows into the href (T-07-06 mitigation)"
metrics:
  duration: "171s"
  completed: "2026-04-19"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 7 Plan 02: Bookmarklet Instructions Page Summary

**One-liner:** Static /bookmarklet instructions page with drag anchor hosting the encoded javascript: URI, CSP warning, and install steps — Server Component with Client Component anchor for onClick guard.

## What Was Built

`app/bookmarklet/page.tsx` — Next.js Server Component at the /bookmarklet route. Contains:

1. Matching Corretor UNIP layout (font-heading h1, muted-foreground subtext, max-w-lg column, min-h-svh)
2. Step-by-step install instructions in Portuguese
3. Drag anchor (`<BookmarkletAnchor>`) with the full encoded `javascript:` URI
4. CSP warning box explaining why the bookmarklet may appear to do nothing on UNIP
5. "What it does" summary with ava.ead.unip.br domain safety note

`app/bookmarklet/BookmarkletAnchor.tsx` — Thin Client Component that renders the `<a>` tag with:
- `href={href}` — receives BOOKMARKLET_HREF passed from the Server Component
- `onClick={(e) => e.preventDefault()}` — prevents Next.js router from intercepting the javascript: href
- `draggable={true}` — explicit drag hint for all browsers
- Styled as a button-like pill with `cursor-grab`

The `/bookmarklet` route is statically prerendered (shown as `○` in build output).

## Verifications Passed

- All 10 content checks: javascript:(async, onClick, draggable, eslint-disable, font-heading, text-muted-foreground, max-w-lg, min-h-svh, ava.ead.unip.br, Content Security Policy
- No `"use client"` in page.tsx
- `npm run build` exits 0 — TypeScript, ESLint, and prerender all pass
- /bookmarklet listed as static route in build output

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extracted onClick handler into Client Component for Next.js 16 compatibility**
- **Found during:** Task 1 — build step
- **Issue:** Next.js 16 App Router throws `Error: Event handlers cannot be passed to Client Component props` during prerender when `onClick` is placed directly on an `<a>` tag in a Server Component. The plan's `<interfaces>` section showed the inline anchor pattern, which worked in older Next.js versions but fails in Next.js 16 Turbopack.
- **Fix:** Created `app/bookmarklet/BookmarkletAnchor.tsx` as a `"use client"` component containing the anchor with `onClick` and `draggable`. The parent `page.tsx` remains a Server Component and passes `BOOKMARKLET_HREF` as a prop.
- **Files modified:** `app/bookmarklet/page.tsx`, `app/bookmarklet/BookmarkletAnchor.tsx` (new)
- **Commit:** 7c9dbdf

**2. [Rule 1 - Bug] Rewrote verify script logic — "use client" false positive from Portuguese word "Verifique"**
- **Found during:** Task 1 — verification step
- **Issue:** The plan's verify script checks `src.includes('use client')` to ensure the directive is absent. The Portuguese word "Verifique" contains the substring "que" not "use client", but the original comment `// Server Component — no "use client" needed` contained the literal substring `use client` inside the comment, causing a false positive.
- **Fix:** Rewrote the top comment to `// Server Component — static HTML, no client directive needed.` which does not contain the substring. The verify script was also adapted to check onClick/draggable in BookmarkletAnchor.tsx instead of page.tsx.
- **Files modified:** `app/bookmarklet/page.tsx`
- **Commit:** 7c9dbdf

## Known Stubs

None — the page is fully wired. BOOKMARKLET_HREF contains the complete encoded javascript: URI from public/bookmarklet-source.js. No placeholder content.

## Threat Flags

None — page.tsx is a Server Component with no dynamic data. BOOKMARKLET_HREF is a compile-time constant (T-07-06 mitigated). No new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- `app/bookmarklet/page.tsx` exists: FOUND
- `app/bookmarklet/BookmarkletAnchor.tsx` exists: FOUND
- Commit 7c9dbdf exists: FOUND
