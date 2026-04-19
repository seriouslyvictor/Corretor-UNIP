---
phase: 07-bookmarklet
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - public/bookmarklet-source.js
  - app/bookmarklet/page.tsx
  - app/bookmarklet/BookmarkletAnchor.tsx
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files reviewed: the unminified bookmarklet source, the Next.js page that embeds the encoded bookmarklet URI, and the client anchor component. The minified URI in `page.tsx` was decoded and verified to faithfully match `bookmarklet-source.js` — no divergence there.

Two warnings were found in the bookmarklet logic itself: one can silently produce a broken data URI (empty MIME type), and one silently swallows a clipboard failure while still telling the user the copy succeeded. One info item notes a minor mobile UX gap in the anchor component.

No security vulnerabilities were found. The `credentials: 'include'` fetch is intentional and appropriate for authenticated AVA images.

---

## Warnings

### WR-01: Empty `blob.type` produces an invalid data URI

**File:** `public/bookmarklet-source.js:22`

**Issue:** `blob.type` is an empty string `""` when the server response omits a `Content-Type` header (this is allowed by the Fetch spec). The resulting data URI becomes `data:;base64,...`, which is technically malformed — browsers may refuse to render it or treat the image as broken. AVA images are likely served with a proper MIME type today, but this is a silent failure path that is easy to guard against.

**Fix:** Fall back to `image/jpeg` (or `image/png`) when `blob.type` is empty:

```js
const mimeType = blob.type || 'image/jpeg';
img.src = 'data:' + mimeType + ';base64,' + btoa(bin);
```

The same fix must be applied to the matching line in the encoded `BOOKMARKLET_HREF` constant in `app/bookmarklet/page.tsx` (re-minify and re-encode after changing the source).

---

### WR-02: Clipboard failure in `execCommand` fallback is swallowed — user sees false success alert

**File:** `public/bookmarklet-source.js:39-42`

**Issue:** `document.execCommand('copy')` returns `false` when the copy fails (e.g., browser has deprecated the API and silently no-ops it). The return value is never checked. Because the `alert` on line 42 fires unconditionally after both the primary Clipboard API path and the fallback path, the user is told "HTML copiado com N imagens incorporadas" even when nothing was actually written to the clipboard.

**Fix:** Check the return value and alert differently on failure:

```js
const ok = document.execCommand('copy');
document.body.removeChild(ta);
if (!ok) {
  alert('Não foi possível copiar automaticamente. Selecione o campo de texto e use Ctrl+C.');
  return;
}
```

Alternatively, surface the error in the primary `catch` block as well (the current code silently falls through to the alert when `navigator.clipboard.writeText` throws).

---

## Info

### IN-01: Mobile tap on bookmarklet anchor gives no feedback

**File:** `app/bookmarklet/BookmarkletAnchor.tsx:14`

**Issue:** `onClick={(e) => e.preventDefault()}` is correct for desktop (prevents Next.js router intercept), but on a mobile browser a user who taps the link sees nothing happen — no navigation, no error, no explanation. Bookmarklets are unsupported on most mobile browsers, but a brief hint would improve UX.

**Fix:** Either add a `title` attribute with a tooltip, or detect mobile and show a toast/alert explaining that bookmarklets require a desktop browser. The simplest non-invasive option:

```tsx
<a
  href={href}
  onClick={(e) => {
    e.preventDefault();
    // Optional: mobile-only hint
  }}
  title="Arraste para a barra de favoritos — não clique"
  ...
>
```

The page already has a static note ("Não clique — arraste"), so this is low priority.

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
