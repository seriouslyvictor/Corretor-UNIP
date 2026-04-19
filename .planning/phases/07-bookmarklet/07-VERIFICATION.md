---
phase: 07-bookmarklet
verified: 2026-04-19T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Drag the bookmarklet anchor from /bookmarklet to browser toolbar, then navigate to a UNIP review page and click it"
    expected: "Images inline as data-URIs; alert appears saying 'HTML copiado com N imagens incorporadas'; clipboard contains full page HTML with inlined images"
    why_human: "Requires an authenticated UNIP session on ava.ead.unip.br — cannot test from codebase alone"
  - test: "Paste the clipboard content from the bookmarklet into the Corretor HTML textarea and click Corrigir"
    expected: "No yellow CORS warning appears; AI answers reference image content correctly; imagesFailed counter is 0"
    why_human: "End-to-end flow requires real UNIP session credentials and a live AVA page with image questions"
  - test: "Check bookmarklet on Safari — verify execCommand fallback fires after async fetches expire the gesture"
    expected: "Clipboard is written via execCommand fallback; no silent failure"
    why_human: "Safari gesture expiry behavior requires a real Safari session to test"
---

# Phase 7: Bookmarklet Verification Report

**Phase Goal:** Browser bookmarklet runs on ava.ead.unip.br, inlines all question images as data-URIs into the page HTML, and copies the enriched HTML to clipboard — enabling Corretor to receive pre-fetched image data and bypassing the CORS 401 error in the HTML paste flow.
**Verified:** 2026-04-19
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bookmarklet inlines all HTTP img srcs as base64 data-URIs | VERIFIED | `bookmarklet-source.js`: `fetch(img.src, {credentials:'include'})` → chunked btoa loop → `img.src = 'data:' + blob.type + ...` |
| 2 | Clipboard receives full `document.documentElement.outerHTML` after inlining | VERIFIED | `navigator.clipboard.writeText(html)` with `execCommand('copy')` textarea fallback — both paths present |
| 3 | Pasting that HTML into Corretor produces image-aware AI answers (no CORS/401) | VERIFIED | `resolveImages()` guard: `if (!q.imageBase64?.startsWith("http")) return q` — parser strips data-URI prefix, payload never starts with "http", fetch skipped entirely, `imagesFailed` stays 0 |
| 4 | Large images do not cause a RangeError (chunked btoa loop, not spread) | VERIFIED | Source uses `for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])` and `btoa(bin)`. Spread form (`btoa(String.fromCharCode(...new Uint8Array(...)))`) is absent. |
| 5 | User can navigate to /bookmarklet and see an instructions page with a draggable anchor | VERIFIED | `app/bookmarklet/page.tsx` exports `BookmarkletPage` at `/bookmarklet` route. `BookmarkletAnchor` component renders `<a href={BOOKMARKLET_HREF} draggable={true}>` |
| 6 | If `navigator.clipboard` is unavailable, `execCommand` fallback is used | VERIFIED | `try { await navigator.clipboard.writeText(html) } catch { ... document.execCommand('copy') ... }` — fallback path confirmed in source |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `public/bookmarklet-source.js` | Unminified bookmarklet IIFE — source of truth for the javascript: URI | VERIFIED | 44 lines, valid JS (vm.Script check passes), contains all 8 required patterns |
| `app/bookmarklet/page.tsx` | Next.js Server Component instructions page at /bookmarklet route | VERIFIED | No "use client", exports default BookmarkletPage, contains BOOKMARKLET_HREF constant with `javascript:(async` prefix |
| `app/bookmarklet/BookmarkletAnchor.tsx` | Client Component wrapper for onClick and draggable on the anchor | VERIFIED | "use client", `onClick={(e) => e.preventDefault()}`, `draggable={true}`, `href={href}` — correctly extracted to satisfy Next.js 16 App Router constraint |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `public/bookmarklet-source.js` | `app/bookmarklet/page.tsx` | Minified + encodeURIComponent embedded in BOOKMARKLET_HREF constant | WIRED | `page.tsx` BOOKMARKLET_HREF = `javascript:(async()%3D%3E%7B...` — encoded form matches minified source logic |
| `app/bookmarklet/page.tsx` | `BookmarkletAnchor.tsx` | Import + prop pass `href={BOOKMARKLET_HREF}` | WIRED | `import BookmarkletAnchor from "./BookmarkletAnchor"` + `<BookmarkletAnchor href={BOOKMARKLET_HREF} />` |
| Bookmarklet clipboard output | `lib/parser.ts` | data-URI `img.src` → parser extracts base64 payload | WIRED | `parser.ts` lines 75-77: `if (src.startsWith("data:")) { imageBase64 = src.slice(commaIndex + 1) }` |
| `lib/parser.ts` | `app/page.tsx` resolveImages() | Base64 payload (no "http" prefix) → `resolveImages()` guard skips CORS fetch | WIRED | `if (!q.imageBase64?.startsWith("http")) return q` — data-URI payloads pass through untouched; `imagesFailed` stays 0 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| Bookmarklet (runs on UNIP) | `httpImgs[]` | `document.querySelectorAll('img')` filtered for `http` srcs | Yes — selects live DOM images from the real UNIP page | FLOWING |
| `app/page.tsx` | `imagesFailed` | `resolveImages()` counter — incremented only when fetch fails | 0 when data-URIs used (no fetch attempted) | FLOWING |
| `app/page.tsx` CORS warning | `{imagesFailed > 0 && ...}` | `imagesFailed` state | Warning suppressed (0) when bookmarklet HTML pasted | FLOWING |

**Data-flow for SC3 (no CORS warning):**
1. Bookmarklet inlines images: `img.src = 'data:image/png;base64,...'`
2. Parser: `src.startsWith("data:")` → `imageBase64 = src.slice(commaIndex + 1)` = base64 payload only (e.g. `iVBOR...`)
3. `resolveImages()`: `imageBase64.startsWith("http")` = false → `return q` (no fetch, no increment)
4. `imagesFailed` = 0 → warning block `{imagesFailed > 0 && ...}` does not render
5. Full base64 payload passed to `/api/solve` → Gemini receives image data

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| bookmarklet-source.js is valid JS | `new (require('vm').Script)(source)` | Compiled OK | PASS |
| bookmarklet-source.js has all required patterns | node pattern check script | All 8 checks passed | PASS |
| bookmarklet-source.js has no spread btoa | grep `...new Uint8Array` | Not found | PASS |
| page.tsx has all required patterns | node pattern check script | All 8 checks passed | PASS |
| page.tsx has no "use client" | string check | Absent | PASS |
| BookmarkletAnchor.tsx has onClick + draggable | node pattern check | All checks passed | PASS |
| Data-URI flow skips CORS fetch | logic trace via node | `imageBase64.startsWith("http")` = false | PASS |
| Git commits exist (ebfb05e, 7c9dbdf) | git log | Both present in recent log | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BOOKMARKLET-SC1 | 07-02-PLAN.md | User can drag bookmarklet to toolbar from instructions page | SATISFIED | `/bookmarklet` route with `BookmarkletAnchor` drag target exists |
| BOOKMARKLET-SC2 | 07-01-PLAN.md, 07-02-PLAN.md | Bookmarklet inlines images as data-URIs and copies HTML to clipboard | SATISFIED | Chunked btoa IIFE in `bookmarklet-source.js`, encoded in `page.tsx` BOOKMARKLET_HREF |
| BOOKMARKLET-SC3 | 07-01-PLAN.md | Pasting enriched HTML produces image-aware answers, no CORS/401 | SATISFIED | Data-URI passthrough path confirmed in parser + resolveImages guard |

Note: BOOKMARKLET-SC1/SC2/SC3 are phase-internal IDs from plan frontmatter. The ROADMAP.md success criteria map 1:1 to these three items. REQUIREMENTS.md does not enumerate bookmarklet requirements — these were introduced as a new phase outside the v1.1 requirement table.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No stub patterns, placeholder comments, hardcoded empty returns, or TODO/FIXME markers found in any of the three phase artifacts.

**Notable deviation from plan:** Plan 07-02 specified an inline `onClick` on the `<a>` tag in `page.tsx`. The executor correctly identified that Next.js 16 App Router forbids event handlers on Server Component elements during prerender, and extracted `BookmarkletAnchor.tsx` as a `"use client"` component. This is a valid implementation deviation that satisfies the same must-have (onClick prevents navigation) while being compatible with the actual framework version.

### Human Verification Required

#### 1. Bookmarklet drag and execution on UNIP

**Test:** From a browser, navigate to `[corretor-url]/bookmarklet`. Drag the "Corretor UNIP — Copiar HTML" button to the bookmarks bar. Log in to AVA UNIP, open a prova de revisão page that has image questions, and click the bookmarklet.
**Expected:** All `<img>` tags with http srcs are replaced with data-URIs in the live page. An alert appears: "HTML copiado com N imagens incorporadas. Cole no Corretor UNIP." where N > 0.
**Why human:** Requires an authenticated UNIP session on `ava.ead.unip.br`. Cannot simulate the same-origin credential fetch from outside the browser context.

#### 2. End-to-end paste flow with no CORS warning

**Test:** After step 1, paste the clipboard content into the Corretor HTML textarea and click Corrigir.
**Expected:** The yellow CORS warning banner ("bloqueio de CORS do AVA") does not appear. AI answers reference image content. The solve produces the same quality answers as with direct image URL resolution.
**Why human:** Requires both the UNIP session (step 1) and a live Gemini API call. The code path is verified statically but the actual Gemini image-comprehension quality cannot be automated.

#### 3. Safari clipboard fallback

**Test:** On Safari, repeat step 1. After the async image fetches complete, the `navigator.clipboard` gesture window will have expired.
**Expected:** The `execCommand` fallback path executes silently; clipboard is populated. No error is shown.
**Why human:** Safari's gesture expiry behavior for clipboard API cannot be replicated in a Node.js test environment.

### Gaps Summary

No automated gaps found. All six truths are verified with code evidence. The three human verification items are runtime behaviors that require a real UNIP session — they cannot be confirmed or denied from static analysis. The implementation logic for all three is present and correct.

**Discoverability note:** The `/bookmarklet` route has no inbound link from the main Corretor page. The success criterion ("User can drag the bookmarklet to their browser toolbar from a Corretor instructions page") is technically met — the instructions page exists at `/bookmarklet` — but users must know the URL. This is an observable UX limitation but does not violate the stated success criteria. The criterion does not require a link from the main page.

---

_Verified: 2026-04-19_
_Verifier: Claude (gsd-verifier)_
