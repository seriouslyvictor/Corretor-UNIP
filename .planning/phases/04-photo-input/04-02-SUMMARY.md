---
phase: 04-photo-input
plan: "02"
subsystem: input-ui
tags: [photo-input, image-queue, thumbnail-grid, camera-capture, file-upload]
dependency_graph:
  requires: [04-01]
  provides: [photo-scan-tab, image-queue-state, queued-image-interface]
  affects: [app/page.tsx, components/photo-scan-tab.tsx]
tech_stack:
  added: []
  patterns: [object-url-lifecycle, ref-triggered-file-input, append-only-queue-state]
key_files:
  created:
    - components/photo-scan-tab.tsx
  modified:
    - app/page.tsx
decisions:
  - "Used p-2.5 wrapper on X remove button (not p-1 from UI-SPEC spacing note) to achieve 44x44px touch target per WCAG 2.5.5 — plan notes explicitly corrected this"
  - "onExtract prop is a stub (console.log) per plan; Phase 5 replaces with /api/extract POST call"
  - "Used <img> (not next/image <Image>) for blob: URL thumbnails — Next.js Image component does not support blob: URLs; ESLint warning acknowledged as false positive for this use case"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-05"
  tasks_completed: 2
  files_modified: 1
  files_created: 1
---

# Phase 04 Plan 02: PhotoScanTab Component + Foto Tab Wiring Summary

**One-liner:** PhotoScanTab component built with image queue state, thumbnail grid, camera/file input (capture=environment), and Extract CTA; wired into app/page.tsx replacing Em construção placeholder.

---

## What Was Done

### Task 1: Create PhotoScanTab component with queue state and thumbnail grid

**Commit:** `43a1ad7`

Created `components/photo-scan-tab.tsx` as a `"use client"` React component.

**Exports:**
- `QueuedImage` interface — `{ id: string; file: File; previewUrl: string }` — the Phase 5 handoff contract
- `PhotoScanTabProps` interface — `{ onExtract?: (images: QueuedImage[]) => void }`
- `PhotoScanTab` function component

**Key behaviors implemented:**
- Hidden `<input type="file" accept="image/*" capture="environment" multiple>` triggered via `fileInputRef`
- `+ Adicionar imagem` button (`variant="outline"`, full-width, `Plus` icon) calls `fileInputRef.current?.click()`
- `onChange` handler appends valid images (MIME `image/*`) to queue; sets Portuguese error for invalid types
- Input value reset to `""` after each selection so re-selecting the same file fires onChange again
- Thumbnail grid (`grid grid-cols-2 gap-2 sm:grid-cols-3`) renders only when `images.length > 0`
- Each thumbnail: `Card > CardContent p-0 relative overflow-hidden aspect-square` with `<img object-cover>` and absolute-positioned X remove button (`aria-label="Remover imagem"`)
- Remove handler revokes the object URL before filtering from state
- Unmount cleanup effect revokes all remaining object URLs (T-04-04 mitigation)
- Error alert (`role="alert"`, `rounded-lg border border-destructive/50 bg-destructive/10`) with `Warning` icon
- `Extrair Questões` CTA (`variant="default"`, `size="lg"`, `ArrowRight` icon, `disabled={images.length === 0}`)

### Task 2: Wire PhotoScanTab into app/page.tsx Foto branch

**Commit:** `42d1edc`

Modified `app/page.tsx`:
- Added `import { PhotoScanTab, type QueuedImage } from "@/components/photo-scan-tab"`
- Replaced `<div className="text-sm text-muted-foreground text-center py-8">Em construção</div>` with `<PhotoScanTab onExtract={(images: QueuedImage[]) => { console.log("extract requested", images.length); }} />`
- HTML tab branch unchanged

---

## Phase 5 Integration Contract

Phase 5 (`05-photo-extraction`) should:

1. Replace the `console.log` stub in `app/page.tsx` with a real handler:
   ```tsx
   onExtract={async (images: QueuedImage[]) => {
     // Base64-encode each image.file, POST to /api/extract
     const base64Images = await Promise.all(
       images.map((img) => fileToBase64(img.file))
     );
     // ... call API
   }}
   ```

2. Consume `QueuedImage.file` (raw `File` object) for base64 encoding or FormData upload

3. The queue state lives inside `PhotoScanTab` — if Phase 5 needs to reset the queue after extraction, expose a `ref` or `onExtractComplete` callback

---

## Threat Mitigations Applied

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-04-04 | Mitigated | `URL.revokeObjectURL` in remove handler + unmount useEffect cleanup |
| T-04-05 | Noted | `file.type.startsWith("image/")` client-side check; server validation deferred to Phase 5 |
| T-04-06 | Accepted | No hard queue limit per D-09 |
| T-04-07 | Mitigated | `alt=""` on thumbnail img; no user-controlled strings reach DOM beyond blob: URL |
| T-04-08 | Accepted | `capture="environment"` is a browser hint, no elevated permissions |

---

## Deviations from Plan

**1. [Rule 2 - Correctness] Touch target correction on X remove button**
- **Found during:** Task 1 implementation
- **Issue:** Plan notes contained a self-correction: `p-1` + `size={24}` yields ~32px tap area (below WCAG 2.5.5 minimum 44px). The plan explicitly corrected to `p-2.5` + `size={24}`.
- **Fix:** Used `p-2.5` wrapper (10px padding each side) + `size={24}` icon = 44px total tap target, as instructed in the plan's final rule.
- **Files modified:** `components/photo-scan-tab.tsx`

**2. [Rule 1 - False positive] `<img>` vs `<Image />` ESLint warning**
- **Found during:** Task 1 verification
- **Issue:** ESLint (`@next/next/no-img-element`) warns about using `<img>` instead of `<Image />` from `next/image`.
- **Assessment:** Warning is a false positive — `URL.createObjectURL` produces `blob:` URLs which Next.js `<Image>` does not support (requires static or remote URLs). `<img>` is the correct choice for object URL previews.
- **Outcome:** Warning acknowledged; lint exits 0 errors (1 warning). No code change needed.

---

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `console.log("extract requested", images.length)` | `app/page.tsx` | ~321 | Intentional — Phase 5 replaces with /api/extract POST call |

---

## Self-Check

- `components/photo-scan-tab.tsx` exists: FOUND
- `app/page.tsx` modified: FOUND
- Commit `43a1ad7` (Task 1): FOUND
- Commit `42d1edc` (Task 2): FOUND
- `npx tsc --noEmit` exits 0: PASS
- `grep -c "capture=\"environment\"" components/photo-scan-tab.tsx` = 1: PASS
- `grep -c "URL.revokeObjectURL" components/photo-scan-tab.tsx` = 2: PASS
- `grep -c "PhotoScanTab" app/page.tsx` = 2: PASS
- `grep -c "Em construção" app/page.tsx` = 0: PASS

## Self-Check: PASSED
