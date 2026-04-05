---
phase: 04-photo-input
verified: 2026-04-04T00:00:00Z
status: human_needed
score: 9/9 must-haves verified
gaps: []
human_verification:
  - test: "Mobile camera capture via capture=environment"
    expected: "On iOS Safari or Android Chrome, tapping '+ Adicionar imagem' shows a native sheet offering camera capture as an option (rear camera prioritized)"
    why_human: "capture=environment is a browser hint — verified present in code but actual mobile browser sheet behavior cannot be confirmed programmatically"
  - test: "Thumbnail grid responsive column switch"
    expected: "At viewport ≥640px grid shows 3 columns; below 640px shows 2 columns"
    why_human: "sm:grid-cols-3 Tailwind class is present in code but visual layout requires a browser at both widths to confirm"
  - test: "Object URL memory — no blob: URL leak after remove"
    expected: "After removing all thumbnails, no blob: URLs remain active in browser memory (verify via DevTools > Application > Blob URLs or Memory profiler)"
    why_human: "revokeObjectURL calls are in code but actual memory release requires a live browser session with DevTools"
  - test: "HTML paste flow regression"
    expected: "Paste valid UNIP review HTML into textarea, click 'Corrigir prova' — results stream and gabarito grid renders correctly"
    why_human: "Requires a live Gemini API key and running dev server; cannot verify network streaming statically"
---

# Phase 4: Photo Input Verification Report

**Phase Goal:** User can supply physical test images — via file upload or live camera — ready for extraction
**Verified:** 2026-04-04
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

All three success criteria have implementation evidence. The photo input UI is fully built and wired. Four items require a human with a running browser to confirm behavioral and platform-specific outcomes.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a two-tab toggle (HTML \| Foto) above the input area | VERIFIED | `app/page.tsx` lines 256-273: `border border-border rounded-lg p-1 flex gap-1` container with two `Button` children, `Code`/`Camera` Phosphor icons, `aria-pressed`, labels "HTML"/"Foto" |
| 2 | HTML tab no longer shows the file upload drop card — only the paste Textarea remains | VERIFIED | Zero matches for `uploadedHTML`, `UploadSimple`, `handleDragOver`, `handleDrop`, `readFile`, `isDragOver` in `app/page.tsx`. Upload Card removed. |
| 3 | HTML tab subtitle reads "Cole o HTML da revisão de prova abaixo." | VERIFIED | `app/page.tsx` line 250: exact string confirmed via grep |
| 4 | HTML tab paste flow still works end-to-end (paste HTML, submit, results render) | VERIFIED (code) / HUMAN (live) | `handleSubmit` reads `pasteHTML.trim()` only (line 95); API call, streaming reader, and state updates are all intact — live regression test needed |
| 5 | Photo tab is selectable and renders PhotoScanTab (not placeholder) | VERIFIED | `app/page.tsx` lines 318-323: `tab === "photo"` branch renders `<PhotoScanTab onExtract={...} />`. "Em construção" placeholder gone (0 grep matches). |
| 6 | User can select one or more images and see them queued as thumbnails | VERIFIED | `photo-scan-tab.tsx` lines 31-61: `onChange` handler appends valid `QueuedImage[]` to state via `setImages((prev) => [...prev, ...valid])`. Thumbnail grid renders at lines 88-109. |
| 7 | On mobile browser, camera capture is offered via capture=environment | VERIFIED (code) / HUMAN (device) | `photo-scan-tab.tsx` line 123: `capture="environment"` attribute present on hidden `<input type="file">`. Browser/device behavior requires human on mobile. |
| 8 | User can add more images without replacing the queue (append-only) | VERIFIED | `setImages((prev) => [...prev, ...valid])` — spreads new images onto existing array; input value reset to `""` after each pick so same file can re-trigger onChange |
| 9 | "Extrair Questões" CTA is disabled when queue is empty; enabled with ≥1 image | VERIFIED | `photo-scan-tab.tsx` line 132: `disabled={images.length === 0}` on the CTA button |

**Score: 9/9 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/page.tsx` | Tab toggle scaffolding, HTML-tab simplification, Photo-tab wiring | VERIFIED | Contains `tab === "html"`, `tab === "photo"`, `PhotoScanTab` import + usage; all removed symbols absent |
| `components/photo-scan-tab.tsx` | PhotoScanTab component: image queue, thumbnail grid, camera/file picker, Extract CTA | VERIFIED | 141 lines; exports `QueuedImage`, `PhotoScanTabProps`, `PhotoScanTab`; contains `capture="environment"`, `URL.revokeObjectURL` (x2), `multiple`, `aria-label="Remover imagem"` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `+ Adicionar imagem` button | Hidden `<input type="file">` | `fileInputRef.current?.click()` | WIRED | `photo-scan-tab.tsx` line 114: `onClick={() => fileInputRef.current?.click()}` |
| `<input>` onChange | Queue state append | `URL.createObjectURL` + `setImages((prev) => [...prev, ...valid])` | WIRED | `photo-scan-tab.tsx` lines 31-61 |
| `app/page.tsx` photo branch | `PhotoScanTab` component | `import { PhotoScanTab } from "@/components/photo-scan-tab"` | WIRED | `app/page.tsx` lines 11, 319-323 |
| Remove button ✕ | Object URL cleanup + state filter | `URL.revokeObjectURL(target.previewUrl)` before filter | WIRED | `photo-scan-tab.tsx` lines 63-68 |
| Unmount | Object URL cleanup | `useEffect` cleanup function | WIRED | `photo-scan-tab.tsx` lines 23-29 |

---

### Data-Flow Trace (Level 4)

The `PhotoScanTab` component renders user-selected images. Data flows from `<input type="file">` onChange → `handleFilesSelected` → `URL.createObjectURL(file)` → `images` state → JSX thumbnail grid. No external API calls or database queries are involved at this phase — images live entirely in browser memory as File objects and blob: URLs, which is correct for Phase 4's scope (Phase 5 handles extraction).

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `components/photo-scan-tab.tsx` | `images: QueuedImage[]` | `e.target.files` from `<input>` onChange | Yes — real user-selected File objects | FLOWING |
| `components/photo-scan-tab.tsx` | `previewUrl` (rendered in `<img src>`) | `URL.createObjectURL(file)` | Yes — live blob: URL from File | FLOWING |

---

### Behavioral Spot-Checks

Step 7b skipped for `PhotoScanTab` — the component requires a live browser with user file-selection interaction; no CLI-testable entry point exists. The module exports are verifiable statically.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `PhotoScanTab` is a named export | `grep -c "^export function PhotoScanTab" components/photo-scan-tab.tsx` | 1 | PASS |
| `QueuedImage` interface exported | `grep -c "^export interface QueuedImage" components/photo-scan-tab.tsx` | 1 | PASS |
| `capture="environment"` present | `grep -c 'capture="environment"' components/photo-scan-tab.tsx` | 1 | PASS |
| Commits from SUMMARY exist in git | `git show --stat b874b3d 43a1ad7 42d1edc` | All three commits found | PASS |
| "Em construção" placeholder removed | `grep -c "Em construção" app/page.tsx` | 0 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INPUT-01 | 04-02 | User can upload one or more image files (JPG/PNG/HEIC) | SATISFIED | `<input accept="image/*" multiple>` + queue append logic + thumbnail grid |
| INPUT-02 | 04-02 | User can capture a photo directly via device camera | SATISFIED (code) / HUMAN (device) | `capture="environment"` attribute present; mobile behavior requires human verification |
| INPUT-03 | 04-02 | User can upload multiple images to cover a multi-page test | SATISFIED | `multiple` attribute + append-only `setImages((prev) => [...prev, ...valid])` + no image count limit |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/page.tsx` | 321 | `console.log("extract requested", images.length)` — `onExtract` stub | INFO | Intentional per plan — Phase 5 replaces with `/api/extract` POST call. Not a blocker for Phase 4 goal. |

No blocking stubs or missing implementations found. The `console.log` is a documented, intentional integration point for Phase 5.

---

### Locked Decisions Verification

| Decision | Requirement | Status | Evidence |
|----------|-------------|--------|----------|
| D-01: Tab toggle HTML \| Foto in existing input section | Tab visible in page.tsx input area | VERIFIED | Lines 256-273 of `app/page.tsx` |
| D-02: HTML tab paste-only, file upload removed | No upload Card in HTML tab | VERIFIED | Zero matches for all removed symbols |
| D-03: Native OS picker via `input type=file accept=image/*` | Present in PhotoScanTab | VERIFIED | `photo-scan-tab.tsx` line 119-127 |
| D-04: `capture=environment` attribute | Desktop gets file picker, mobile gets camera hint | VERIFIED (code) | Line 123 of `photo-scan-tab.tsx` |
| D-05: Thumbnail grid with object-URL previews and ✕ remove buttons | Thumbnail grid with remove buttons | VERIFIED | Lines 88-109 of `photo-scan-tab.tsx` |
| D-06: No page labels | No page number labels on thumbnails | VERIFIED | No Label component or ordinal text in thumbnail map |
| D-07: "Extrair Questões" CTA disabled until ≥1 image queued | `disabled={images.length === 0}` | VERIFIED | `photo-scan-tab.tsx` line 132 |
| D-08: "+ Adicionar imagem" button below grid | Button present, always visible | VERIFIED | Lines 111-117 of `photo-scan-tab.tsx` |
| D-09: No hard limit on image count | No count guard in handler | VERIFIED | `handleFilesSelected` appends without limit check |

---

### Human Verification Required

#### 1. Mobile Camera Capture (INPUT-02)

**Test:** On iOS Safari or Android Chrome, open the app, switch to "Foto" tab, tap "+ Adicionar imagem"
**Expected:** Native sheet appears offering "Camera" / "Photo Library" options; selecting Camera opens the rear camera (environment-facing)
**Why human:** `capture="environment"` is a browser hint verified in code, but actual mobile browser sheet behavior and camera selection require a physical device or emulator

#### 2. Responsive Thumbnail Grid Layout

**Test:** Open the app at a viewport below 640px (mobile) and above 640px (tablet/desktop), switch to "Foto" tab, add 3+ images
**Expected:** Mobile shows 2 columns; 640px+ shows 3 columns
**Why human:** `grid-cols-2 sm:grid-cols-3` classes are present in code but visual layout requires a browser at both widths to confirm Tailwind breakpoints are applied correctly

#### 3. Object URL Memory — No Leak After Remove

**Test:** Add 3 images via "Foto" tab, then click ✕ on each to remove all. Open DevTools > Application (or Memory profiler) and inspect remaining blob: URLs
**Expected:** No blob: URLs remain active after all thumbnails are removed
**Why human:** `URL.revokeObjectURL` calls are wired in code (remove handler + unmount cleanup) but actual memory release confirmation requires a live browser session

#### 4. HTML Paste Flow Regression

**Test:** Switch to "HTML" tab, paste valid UNIP review page HTML, click "Corrigir prova"
**Expected:** Results page renders with streaming gabarito grid and confidence-colored letters; no regression from v1 behavior
**Why human:** Requires a live Gemini API key and running dev server; the code paths are intact but streaming network behavior cannot be verified statically

---

### Gaps Summary

No gaps found. All 9 observable truths are backed by implementation evidence in the codebase. All locked decisions (D-01 through D-09) are implemented. All three requirements (INPUT-01, INPUT-02, INPUT-03) have code-level implementation.

The four human verification items are behavioral and platform-specific outcomes — they do not indicate missing implementation; they confirm that existing implementation produces correct runtime behavior.

---

_Verified: 2026-04-04_
_Verifier: Claude (gsd-verifier)_
