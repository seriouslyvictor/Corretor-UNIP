# Phase 7: Bookmarklet - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 2 new files
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/bookmarklet/page.tsx` | page (Server Component) | request-response | `app/page.tsx` | role-match |
| `public/bookmarklet-source.js` | utility (vanilla JS) | file-I/O (blob→base64) | `app/page.tsx` `resolveImages()` lines 17–38 | data-flow-match |

---

## Pattern Assignments

### `app/bookmarklet/page.tsx` (page, request-response)

**Analog:** `app/page.tsx` and `app/layout.tsx`

This is a **Server Component** (no `"use client"` directive needed — no interactivity beyond
a drag anchor). It participates in the root layout defined in `app/layout.tsx`, which wraps
every page with `ThemeProvider` and the three font CSS variables (`--font-heading`,
`--font-sans`, `--font-mono`).

**Layout wrapper pattern** (`app/layout.tsx` lines 16–32):
```tsx
// Root layout wraps all app/ pages automatically — no import needed
// Children receive ThemeProvider + font variables for free
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("antialiased", ...)}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**Page outer shell pattern** (`app/page.tsx` lines 289–296 — the "input" state render):
```tsx
// Server Component page follows this outer-shell structure:
return (
  <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 gap-8">
    <header className="text-center">
      <h1 className="font-heading text-2xl font-semibold">Corretor UNIP</h1>
      <p className="text-base text-muted-foreground">...</p>
    </header>
    <div className="w-full max-w-lg flex flex-col gap-6">
      {/* page content */}
    </div>
  </main>
);
```
Copy this shell verbatim for `app/bookmarklet/page.tsx`. Use `font-heading` on the `<h1>`,
`text-muted-foreground` on supporting paragraphs, and `max-w-lg` on the content column.

**Bookmarklet anchor pattern** (from RESEARCH.md Pattern 2):
```tsx
// Constant holds the minified + encodeURIComponent'd javascript: URI
const BOOKMARKLET_HREF = `javascript:(async()=>{...minified...})()`;

export default function BookmarkletPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 gap-8">
      <header className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Corretor UNIP</h1>
        <p className="text-base text-muted-foreground">Instalar Bookmarklet</p>
      </header>
      <div className="w-full max-w-lg flex flex-col gap-6">
        <p>Arraste o link abaixo para a sua barra de favoritos:</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href={BOOKMARKLET_HREF}
          onClick={(e) => e.preventDefault()}
          draggable={true}
        >
          Corretor UNIP — Copiar HTML
        </a>
      </div>
    </main>
  );
}
```

**Key rules:**
- No `"use client"` — Server Component; the anchor is static HTML.
- `onClick={(e) => e.preventDefault()}` is mandatory (see RESEARCH.md Pitfall 5: Next.js router intercepts `javascript:` hrefs).
- `draggable={true}` makes the drag target explicit on all browsers.
- The `eslint-disable` comment suppresses `@next/next/no-html-link-for-pages` which fires on `javascript:` hrefs.

---

### `public/bookmarklet-source.js` (utility, blob→base64 data flow)

**Analog:** `app/page.tsx` `resolveImages()` function, lines 17–38

The bookmarklet performs the same `fetch → blob → arrayBuffer → btoa → data-URI` pipeline
that `resolveImages()` does, but runs inside the UNIP origin (same cookies, no CORS) and
additionally serializes the DOM and writes to the clipboard.

**Existing resolveImages pattern** (`app/page.tsx` lines 17–38 — canonical reference):
```typescript
async function resolveImages(questions: ParsedQuestion[]) {
  const resolved = await Promise.all(
    questions.map(async (q) => {
      if (!q.imageBase64?.startsWith("http")) return q;
      try {
        const res = await fetch(q.imageBase64, { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status}`);
        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        // NOTE: spread btoa — safe for small images, may stack-overflow on large ones
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return { ...q, imageBase64: `data:${blob.type};base64,${base64}` };
      } catch {
        imagesFailed++;
        return { ...q, imageBase64: null };
      }
    })
  );
}
```

**Bookmarklet adaptation — use chunked loop instead of spread** (RESEARCH.md Pitfall 1):
```javascript
// Replace the spread btoa from resolveImages() with a chunked loop
// to avoid RangeError on large images:
let bin = '';
const bytes = new Uint8Array(buf);
for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
img.src = 'data:' + blob.type + ';base64,' + btoa(bin);
```

**Full unminified bookmarklet source** (store in repo as `public/bookmarklet-source.js`):
```javascript
(async () => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const httpImgs = imgs.filter(img => (img.getAttribute('src') || '').startsWith('http'));

  await Promise.all(httpImgs.map(async (img) => {
    try {
      const res = await fetch(img.src, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      // Chunked loop avoids stack overflow on large images (Pitfall 1)
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
    // execCommand fallback (Pitfall 3: Safari gesture expiry)
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

**To produce the `javascript:` URI for embedding in `BOOKMARKLET_HREF`:**
1. Store unminified source above in `public/bookmarklet-source.js` (not served to users; reference only).
2. Minify manually or via: `npx terser public/bookmarklet-source.js --compress --mangle`
3. Wrap result: `"javascript:" + encodeURIComponent(minifiedSource)`
4. Assign to `BOOKMARKLET_HREF` constant in `app/bookmarklet/page.tsx`.

**Divergence from `resolveImages()`:**
- `resolveImages()` operates on parsed question objects; bookmarklet operates directly on live `<img>` DOM nodes.
- `resolveImages()` uses the spread btoa approach; bookmarklet must use the chunked loop (Pitfall 1).
- `resolveImages()` counts failures for UI feedback; bookmarklet silently skips and reports count via `alert()`.
- `credentials: 'include'` is carried over unchanged — required in both contexts.

---

## Shared Patterns

### Tailwind utility classes (typography + layout)
**Source:** `app/page.tsx` lines 289–296, `components/question-card.tsx`
**Apply to:** `app/bookmarklet/page.tsx`

```tsx
// Heading: font-heading is Oxanium (--font-heading variable from layout.tsx)
<h1 className="font-heading text-2xl font-semibold">

// Supporting text:
<p className="text-base text-muted-foreground">

// Page column:
<div className="w-full max-w-lg flex flex-col gap-6">

// Full-height centering:
<main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 gap-8">
```

### navigator.clipboard.writeText usage
**Source:** `components/gabarito-grid.tsx` lines 37–46
**Apply to:** `public/bookmarklet-source.js` (clipboard write after image resolution)

```typescript
// Existing pattern in gabarito-grid.tsx — simple writeText with .then():
navigator.clipboard.writeText(text).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
});

// Bookmarklet uses async/await + try/catch + execCommand fallback instead
// (can't rely on React state; needs synchronous fallback path)
```

### fetch with credentials: 'include'
**Source:** `app/page.tsx` lines 25–26
**Apply to:** `public/bookmarklet-source.js`

```typescript
const res = await fetch(q.imageBase64, { credentials: "include" });
if (!res.ok) throw new Error(`${res.status}`);
```
Copy this flag unchanged. The bookmarklet is on a different origin (UNIP) but the same
principle applies — cookies must be sent with the image fetch requests.

---

## No Analog Found

No files in this phase are without a codebase analog. Both new files have direct pattern
coverage from `app/page.tsx`.

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`
**Files scanned:** `app/page.tsx`, `app/layout.tsx`, `components/gabarito-grid.tsx`, `components/question-card.tsx`
**Pattern extraction date:** 2026-04-19
