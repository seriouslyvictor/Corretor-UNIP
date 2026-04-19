# Phase 7: Bookmarklet - Research

**Researched:** 2026-04-19
**Domain:** Browser bookmarklet construction, same-origin fetch, base64 image encoding, Clipboard API, Next.js static page hosting
**Confidence:** HIGH

---

## Summary

Phase 7 bypasses the CORS 401 problem by running JavaScript inside the user's authenticated
ava.ead.unip.br browser session rather than from the Corretor origin. A bookmarklet is a
`javascript:` URI saved as a browser bookmark; when clicked on the UNIP review page it executes
as a same-origin author script — same cookies, same origin, no CORS restrictions — so `fetch()`
calls to `bbcswebdav` image URLs succeed without 401 errors.

The bookmarklet must: (1) find all `<img>` elements on the UNIP page, (2) fetch each src URL
using the browser's existing UNIP session, (3) convert each response blob to a base64 data-URI,
(4) replace the `src` attribute in the live DOM, (5) serialize the modified DOM to an HTML
string, and (6) write that string to the clipboard. The user then pastes into Corretor's existing
textarea, and the parser already handles `data:` URIs correctly (parser.ts:75-79).

The instructions page lives inside the existing Next.js app as a new route
(`app/bookmarklet/page.tsx`). It renders an `<a href="javascript:...">` link that users drag to
their browser toolbar. This is the canonical bookmarklet installation pattern; no additional
library is needed.

**Primary recommendation:** Build the bookmarklet as a single IIFE, minify the source by hand
(no build tool needed given small size), percent-encode it, and embed the result in an `<a
href="javascript:...">` anchor on a `/bookmarklet` Next.js page.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch UNIP images | Browser (bookmarklet) | — | Must run in UNIP origin to have session cookies; server has no session |
| base64 encode images | Browser (bookmarklet) | — | Happens in-place before clipboard write |
| Serialize enriched HTML | Browser (bookmarklet) | — | Operates on live UNIP DOM |
| Write to clipboard | Browser (bookmarklet) | — | Clipboard API requires user-gesture context |
| Expose bookmarklet link | Frontend (Next.js page) | — | Static `<a href="javascript:...">` anchor |
| Parse enriched HTML | Browser (Corretor client) | — | Existing parser.ts already handles data-URIs |
| Show CORS warning | Browser (Corretor client) | — | Already implemented; bookmarklet eliminates trigger |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (vanilla JS) | — | Bookmarklet logic | Bookmarklets cannot import external modules; must be self-contained |
| Next.js App Router | 16.1.7 (existing) | Instructions page | Already in project; add `app/bookmarklet/page.tsx` |

No new npm dependencies required. [VERIFIED: package.json]

### Supporting

No supporting libraries. The bookmarklet uses only browser-native APIs:
- `fetch()` + `Response.blob()` + `Blob.arrayBuffer()` + `btoa()` — image to base64
- `document.querySelectorAll('img')` — element selection
- `document.documentElement.outerHTML` — HTML serialization
- `navigator.clipboard.writeText()` — clipboard write (with `document.execCommand` fallback)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `btoa(String.fromCharCode(...new Uint8Array(buf)))` | `FileReader.readAsDataURL()` | FileReader is callback-based, harder to promisify cleanly inside a minified IIFE; btoa approach is already used in `resolveImages()` in page.tsx — consistent pattern |
| `navigator.clipboard.writeText()` | `document.execCommand('copy')` | execCommand is deprecated but works without Permissions API; writeText requires a user gesture and secure context — UNIP is HTTPS so writeText is preferred, execCommand as fallback |
| `document.documentElement.outerHTML` | `XMLSerializer.serializeToString(document)` | outerHTML is simpler and sufficient; XMLSerializer adds XML declaration, less clean |
| New Next.js route (`/bookmarklet`) | Static HTML file in `public/` | Next.js route integrates with existing layout/styles; consistent UX |

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks bookmarklet on ava.ead.unip.br
         |
         v
[Bookmarklet IIFE executes — same-origin context]
         |
         v
  querySelectorAll('img') on UNIP DOM
         |
         v
  For each img.src that starts with 'http':
    fetch(src, {credentials:'include'})  <-- same origin, 401 avoided
         |
         v
    blob -> arrayBuffer -> btoa -> data:image/*;base64,...
         |
         v
    img.src = data-URI (replace in live DOM)
         |
         v
  Serialize: document.documentElement.outerHTML
         |
         v
  navigator.clipboard.writeText(html)
         |
         v
[User pastes into Corretor textarea]
         |
         v
[Existing parseHTML() in parser.ts — already handles data: URIs]
         |
         v
[resolveImages() skips URLs that start with 'data:' — passes through]
         |
         v
[POST /api/solve — image is real base64, no 401 on server side]
```

### Recommended Project Structure

```
app/
├── bookmarklet/
│   └── page.tsx         # Instructions page with drag-to-toolbar link
└── ...existing routes
```

No new `lib/` files needed — bookmarklet is self-contained. No new API routes needed.

### Pattern 1: Bookmarklet IIFE Structure

**What:** Wrap all bookmarklet code in an async IIFE, encode for `javascript:` URI.

**When to use:** Always — bookmarklets must be single-expression URIs.

```javascript
// Source: https://www.freecodecamp.org/news/what-are-bookmarklets/ [CITED]
// Unencoded source (human-readable, stored in repo as a .js file):
(async () => {
  const imgs = document.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map(async (img) => {
    const src = img.getAttribute('src') || '';
    if (!src.startsWith('http')) return;
    try {
      const res = await fetch(src, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      img.src = `data:${blob.type};base64,${b64}`;
    } catch { /* skip failed images */ }
  }));
  const html = document.documentElement.outerHTML;
  try {
    await navigator.clipboard.writeText(html);
    alert('HTML copiado! Cole no Corretor UNIP.');
  } catch {
    // Fallback: execCommand (deprecated but works on older browsers)
    const ta = document.createElement('textarea');
    ta.value = html;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('HTML copiado! Cole no Corretor UNIP.');
  }
})();
```

**To produce the `javascript:` URI:**
1. Store the above as `public/bookmarklet.js` (source of truth)
2. Minify: remove comments, whitespace, shorten variable names
3. `encodeURIComponent(minifiedSource)` — percent-encode the result
4. Prefix with `javascript:` — no space after the colon

**Pattern 2: Exposing for drag-to-toolbar**

```tsx
// app/bookmarklet/page.tsx (Next.js Server Component)
// Source: https://www.freecodecamp.org/news/what-are-bookmarklets/ [CITED]
const BOOKMARKLET_CODE = `javascript:(async()=>{...minified...})()`;

export default function BookmarkletPage() {
  return (
    <main>
      <h1>Instalar Bookmarklet</h1>
      <p>Arraste o link abaixo para a sua barra de favoritos:</p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href={BOOKMARKLET_CODE} onClick={(e) => e.preventDefault()}>
        Corretor UNIP — Copiar HTML
      </a>
      <p>Depois, abra a página de revisão de prova no AVA e clique no favorito.</p>
    </main>
  );
}
```

`onClick={(e) => e.preventDefault()}` prevents accidental navigation when clicked on the
instructions page itself. Users must drag, not click.

### Anti-Patterns to Avoid

- **Dynamic `import()` inside bookmarklet:** Not supported in `javascript:` URI context in all browsers. All code must be inline.
- **`new Uint8Array(buf)` spread on large images:** Large images (>1MB) may cause stack overflow in `btoa(String.fromCharCode(...arr))` because spread expands into function call args. Safer pattern: chunk the array in a loop. [ASSUMED: stack size depends on image count/size; UNIP images are typically small diagrams, likely safe]
- **Assuming `navigator.clipboard` is always available:** Requires secure context (HTTPS — UNIP is HTTPS [ASSUMED]) and a user gesture. The fallback `execCommand` is necessary.
- **Using `innerHTML` instead of `outerHTML`:** `innerHTML` drops the `<html>` tag and attributes; `outerHTML` preserves the full document structure that the parser expects.
- **Forgetting `credentials: 'include'` on fetch:** Without this flag, cookies are not sent even on same-origin requests in some configurations. [ASSUMED: may vary; the existing `resolveImages` in page.tsx uses it]
- **Storing the encoded bookmarklet in a `.tsx` template literal without escaping backticks:** If the minified code contains backticks, the template literal will break. Use single/double quotes in the minified source, or escape backticks.
- **`onClick` without `e.preventDefault()`:** Without it, clicking the anchor on the instructions page navigates to `javascript:undefined` (Next.js intercepts `javascript:` hrefs in its router). Always add `e.preventDefault()` to the instructions page anchor.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Minification | Custom regex-based minifier | Manual minification OR terser CLI one-shot | The script is ~25 lines; hand minification is fast and avoids a build pipeline. For automation: `npx terser bookmarklet.js --compress --mangle` |
| URL encoding | Custom percent-encoder | `encodeURIComponent()` (native) | Browser-native, handles all edge cases |
| Image decoding | Custom binary parser | `blob.arrayBuffer()` + `btoa()` (native) | Already proven in `resolveImages()` in the existing codebase |
| Clipboard write | Custom clipboard lib | `navigator.clipboard.writeText()` + `execCommand` fallback | No library needed; both APIs are browser-native |

**Key insight:** Bookmarklets are inherently a zero-dependency context. Every capability must come from browser-native APIs.

---

## Common Pitfalls

### Pitfall 1: `btoa` fails on large images (stack overflow from spread)

**What goes wrong:** `btoa(String.fromCharCode(...new Uint8Array(largeBuffer)))` spreads all bytes as function arguments. For large images, this exceeds the JS call-stack argument limit (~65k–256k args depending on engine) and throws `RangeError: Maximum call stack size exceeded`.

**Why it happens:** The spread operator `...` converts the TypedArray to individual arguments, and `String.fromCharCode` is called with all of them at once.

**How to avoid:** Use a chunked loop approach:
```javascript
function bufToB64(buf) {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
```
This pattern is O(n) in time and O(n) in string allocation but never blows the stack. [VERIFIED: consistent with existing parser.ts pattern which uses the spread approach — consider switching to loop in bookmarklet given uncertainty about UNIP image sizes]

### Pitfall 2: CSP blocks the bookmarklet on ava.ead.unip.br

**What goes wrong:** If UNIP's Blackboard server sends a `Content-Security-Policy: script-src 'self'` header, the browser may refuse to execute the bookmarklet.

**Why it happens:** Current browser behavior is inconsistent on this. The CSP spec says user bookmarklets should not be blocked, but Chrome (Chromium issue #233903) and Firefox (bug #866522) both enforce CSP against bookmarklets in certain configurations. The behavior is browser-version-dependent. [VERIFIED via Mozilla Bugzilla and Chromium issue tracker]

**How to avoid:** This cannot be fixed in the bookmarklet itself — it is a server-side header on ava.ead.unip.br. We cannot know the exact CSP headers on UNIP's Blackboard without live inspection. The research phase cannot verify this remotely.

**Warning signs:** Bookmarklet appears to do nothing when clicked. Check browser console for `Refused to execute inline script because it violates the following Content Security Policy directive`.

**Mitigation:** If CSP blocks the bookmarklet, the fallback is a browser extension (Manifest V3 content script), which executes at a higher privilege level and bypasses page CSP. Document this as a known limitation.

### Pitfall 3: `navigator.clipboard.writeText()` blocked without user gesture

**What goes wrong:** Clipboard writes require a transient user gesture (click, keypress). Since the bookmarklet runs as a result of clicking the bookmark, this should qualify — but some browsers may require the clipboard write to happen synchronously within the gesture handler, not after an `await`.

**Why it happens:** The user-gesture activation signal can expire after async operations. By the time `await Promise.all(...)` (multiple image fetches) resolves, the gesture may be considered stale.

**How to avoid:** The `navigator.clipboard` call comes after the async fetches, which may expire the gesture in Safari. The `execCommand('copy')` fallback does not require an active user gesture and is synchronous, making it more reliable as the fallback. [ASSUMED: Safari's gesture expiry behavior; confirmed as a known issue in general web development]

### Pitfall 4: Pasting the full `document.documentElement.outerHTML` into Corretor

**What goes wrong:** The full UNIP page HTML may be very large (100KB–several MB with inlined images). The Corretor textarea has no explicit size limit, but the browser's clipboard and the server's JSON body parser both have practical limits.

**Why it happens:** `outerHTML` of a full LMS page includes navigation, scripts, stylesheets, footers, etc. — not just question content.

**How to avoid:** The bookmarklet should target only the question container elements, not the entire document. The UNIP parser looks for `div.takeQuestionDiv` elements. The bookmarklet could serialize only those divs, or use the entire page (the parser already ignores irrelevant content). For simplicity, the full `outerHTML` approach works — the parser discards everything outside `takeQuestionDiv` — but a targeted approach reduces clipboard size. Consider both in planning.

### Pitfall 5: Next.js router intercepts `javascript:` hrefs

**What goes wrong:** Next.js App Router's `<Link>` component and even plain `<a>` tags with `href="javascript:..."` may be intercepted by the router, navigating to a `javascript:` URL and potentially displaying an error or blank page.

**Why it happens:** Next.js intercepts all `<a>` clicks for client-side navigation. `javascript:` URIs are not external URLs.

**How to avoid:** Add `onClick={(e) => e.preventDefault()}` to the anchor element. This prevents the click from navigating while still rendering the `href` with the bookmarklet code for drag-to-toolbar. [ASSUMED: standard practice documented in Next.js bookmarklet discussions]

---

## Code Examples

### Full bookmarklet source (unminified, for storage in repo)

```javascript
// Source: derived from existing resolveImages() pattern in app/page.tsx [VERIFIED: codebase]
// Store as: public/bookmarklet-source.js (not served; reference only)
(async () => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const httpImgs = imgs.filter(img => (img.getAttribute('src') || '').startsWith('http'));

  await Promise.all(httpImgs.map(async (img) => {
    try {
      const res = await fetch(img.src, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      // Chunked loop avoids stack overflow on large images
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      img.src = 'data:' + blob.type + ';base64,' + btoa(bin);
    } catch (e) { /* skip failed images silently */ }
  }));

  const html = document.documentElement.outerHTML;
  try {
    await navigator.clipboard.writeText(html);
  } catch {
    // execCommand fallback for browsers where clipboard API is blocked
    const ta = document.createElement('textarea');
    ta.value = html;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  alert('HTML copiado com ' + httpImgs.length + ' imagens incorporadas. Cole no Corretor UNIP.');
})();
```

### Instructions page (Next.js Server Component)

```tsx
// app/bookmarklet/page.tsx
// Source: standard bookmarklet distribution pattern [CITED: freecodecamp.org/news/what-are-bookmarklets]
// BOOKMARKLET_HREF is the minified + encodeURIComponent'd version of the source above
// prefixed with "javascript:"
const BOOKMARKLET_HREF = `javascript:(async()=>{...})()`;

export default function BookmarkletPage() {
  return (
    <main>
      <h1>Bookmarklet: Corretor UNIP</h1>
      <p>
        Arraste o link abaixo para a sua barra de favoritos do navegador.
        Depois, abra a revisão de prova no AVA UNIP e clique no favorito.
      </p>
      <a
        href={BOOKMARKLET_HREF}
        onClick={(e) => e.preventDefault()}
        draggable={true}
      >
        Corretor UNIP — Copiar HTML
      </a>
    </main>
  );
}
```

### How parser.ts already handles data-URIs

```typescript
// lib/parser.ts lines 74-82 [VERIFIED: codebase]
if (src.startsWith("data:")) {
  const commaIndex = src.indexOf(",");
  imageBase64 = commaIndex !== -1 ? src.slice(commaIndex + 1) : null;
} else if (src) {
  imageBase64 = src; // bare URL — triggers CORS 401 in resolveImages()
}
// After bookmarklet: all img.src values start with "data:" — first branch always taken
// resolveImages() in page.tsx checks: if (!q.imageBase64?.startsWith("http")) return q;
// So data-URI questions are passed through untouched — no fetch attempted
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Chrome 66 / Firefox 63 (2018) | Async, Promise-based; requires user gesture and HTTPS |
| Extension Manifest V2 | Extension Manifest V3 | Chrome 112+ enforced (2023) | MV3 has stricter service worker model; bookmarklet is simpler than extension for this use case |
| `FileReader.readAsDataURL()` | `blob.arrayBuffer()` + `btoa()` | ES2017+ | Both valid; arrayBuffer approach is consistent with existing codebase pattern |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated in all browsers, removed from spec, but still functional as a fallback in 2025. Do not use as primary method. [CITED: MDN]
- `createObjectURL` for clipboard: Not applicable here; we need text (HTML string), not a Blob URL.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ava.ead.unip.br is served over HTTPS | Common Pitfalls #3 | If HTTP, `navigator.clipboard` won't work; execCommand fallback still works |
| A2 | UNIP Blackboard CSP does not block bookmarklet execution | Common Pitfalls #2 | Bookmarklet silently fails; must fall back to browser extension approach |
| A3 | UNIP image files are small enough that the chunked btoa loop is not a performance issue | Code Examples | Large images would slow the bookmarklet; user would wait several seconds |
| A4 | Safari's user-gesture expiry will break `navigator.clipboard` after async image fetches | Common Pitfalls #3 | Safari users cannot use clipboard via writeText; execCommand fallback mitigates |
| A5 | `credentials: 'include'` causes cookies to be sent on same-origin fetch inside bookmarklet | Standard Stack | If cookies are not sent, images return 401 (same as current CORS problem) |
| A6 | `document.documentElement.outerHTML` of the UNIP review page is within clipboard/textarea size limits | Common Pitfalls #4 | Very large pages may be truncated or cause memory issues |

---

## Open Questions

1. **Does UNIP's Blackboard serve a restrictive CSP that blocks `javascript:` bookmarklet execution?**
   - What we know: Blackboard LMS historically does not have strict CSP; the debug file (image-401-auth-error.md) confirmed X-Frame-Options but not script-src CSP.
   - What's unclear: Cannot verify remotely without a UNIP student session.
   - Recommendation: Document as a known risk in the instructions page. "If nothing happens when you click the bookmarklet, your browser may be blocking it."

2. **Should the bookmarklet serialize the whole page or only `div.takeQuestionDiv` elements?**
   - What we know: The parser only looks at `div.takeQuestionDiv` nodes; the rest is ignored.
   - What's unclear: Full `outerHTML` is simpler to implement; targeted serialization reduces clipboard size.
   - Recommendation: Full `outerHTML` for MVP (matches how users currently copy the page source). Can optimize to targeted serialization in a future iteration.

3. **Should the instructions page be a new Next.js route or a static HTML file in `public/`?**
   - What we know: The project uses Next.js App Router with Tailwind + shadcn/ui. A Next.js route gets the existing layout for free. A `public/` file is simpler but unstyled.
   - Recommendation: New App Router page (`app/bookmarklet/page.tsx`) — stays consistent with the project's UI conventions and can reuse the layout.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is a code-only change. No new external services, databases, or CLI tools are required beyond what is already installed in the project.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Bookmarklet runs in user's own authenticated session; no auth logic in Corretor |
| V3 Session Management | no | No session created by Corretor |
| V4 Access Control | no | No new endpoints |
| V5 Input Validation | yes (partial) | The HTML pasted into Corretor is parsed by existing `parseHTML()` which uses jsdom — already implemented |
| V6 Cryptography | no | base64 is encoding, not encryption |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious page tricks user into running bookmarklet on wrong site | Spoofing | Instructions page must clearly state: only run on `ava.ead.unip.br` |
| Full page outerHTML may contain UNIP session tokens in JS variables or hidden inputs | Information Disclosure | The HTML is pasted into Corretor's textarea, sent to Corretor's backend, and processed by Gemini. UNIP session tokens embedded in HTML source are a privacy concern. Mitigation: instruct users to use Corretor only for their own tests; Corretor does not store the pasted HTML |
| XSS via pasted HTML in Corretor | Tampering | `parseHTML()` uses jsdom to parse, not `innerHTML` injection into the live Corretor DOM; the textarea value is not rendered as HTML — existing protection is sufficient |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `lib/parser.ts`, `app/page.tsx`, `lib/schemas.ts` — verified image handling logic
- Codebase: `.planning/debug/image-401-auth-error.md` — confirmed root cause and option analysis
- [MDN: Clipboard API writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — clipboard write API
- [FreeCodeCamp: What are Bookmarklets](https://www.freecodecamp.org/news/what-are-bookmarklets/) — bookmarklet format and distribution

### Secondary (MEDIUM confidence)
- [Mozilla Bugzilla #866522](https://bugzilla.mozilla.org/show_bug.cgi?id=866522) — CSP/bookmarklet interaction in Firefox
- [Chromium Issue #233903](https://bugs.chromium.org/p/chromium/issues/detail?id=233903) — CSP/bookmarklet interaction in Chrome
- [SOCRadar: CSP Bypass via Bookmarklets](https://socradar.io/csp-bypass-unveiled-the-hidden-threat-of-bookmarklets/) — bookmarklet CSP behavior confirmed

### Tertiary (LOW confidence)
- General WebSearch results on bookmarklet length limits (Firefox/Safari ~65,536 bytes; Chrome higher) — not formally verified for all current browser versions

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new libraries; all browser-native APIs
- Architecture: HIGH — derived from existing codebase patterns (resolveImages, parseHTML)
- Pitfalls: MEDIUM — CSP/bookmarklet behavior is browser-version-dependent and UNIP's specific CSP headers are unverified
- Security: MEDIUM — main risk (CSP) is unverifiable without live UNIP access

**Research date:** 2026-04-19
**Valid until:** 2026-10-19 (stable APIs; bookmarklet/CSP browser behavior changes slowly)
