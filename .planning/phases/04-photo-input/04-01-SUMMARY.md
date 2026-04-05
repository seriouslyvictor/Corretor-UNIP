---
phase: 04-photo-input
plan: "01"
subsystem: input-ui
tags: [tab-toggle, input-refactor, html-paste, photo-placeholder]
dependency_graph:
  requires: []
  provides: [tab-state, html-tab-paste-only, photo-tab-placeholder]
  affects: [app/page.tsx]
tech_stack:
  added: []
  patterns: [tab-toggle-state-machine, conditional-tab-content]
key_files:
  created: []
  modified:
    - app/page.tsx
decisions:
  - "Mode toggle and Corrigir prova button scoped inside HTML tab branch (not shared), per UI-SPEC guidance — Photo tab has its own CTA flow in Plan 02"
  - "Separator and cn imports removed as they had no remaining usage after upload card deletion"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-04"
  tasks_completed: 1
  files_modified: 1
---

# Phase 04 Plan 01: Tab Toggle Scaffolding + HTML Tab Simplification Summary

**One-liner:** Tab toggle (HTML | Foto) added with `InputTab` state; HTML file upload Card + drag-and-drop fully removed; Photo tab wired to placeholder for Plan 02.

---

## What Was Done

### Task 1: Add tab state and tab toggle UI, strip HTML file upload

**Commit:** `b874b3d`

Modified `app/page.tsx` to introduce the `InputTab = "html" | "photo"` state machine and the tab toggle UI, and removed all file-upload-related code.

**Added:**
- `type InputTab = "html" | "photo"` type alias
- `const [tab, setTab] = useState<InputTab>("html")` state
- Tab toggle UI at top of input section: `border border-border rounded-lg p-1 flex gap-1` container with two `Button` children, `Code`/`Camera` Phosphor icons, `aria-pressed`, Portuguese labels "HTML" / "Foto"
- Conditional rendering: `tab === "html"` renders paste Textarea + mode toggle + Corrigir prova; `tab === "photo"` renders `<div className="text-sm text-muted-foreground text-center py-8">Em construção</div>`

**Removed:**
- Upload `Card` with drag-and-drop zone (lines ~294-331 of original)
- `Separator` "ou" divider (lines ~333-337 of original)
- `uploadedHTML`, `uploadedFileName`, `isDragOver` state
- `fileInputRef` ref
- `readFile`, `handleFileChange`, `handleDragOver`, `handleDragLeave`, `handleDrop` functions
- `UploadSimple` icon import
- `Separator` component import
- `cn` utility import (no remaining usage)

**Updated:**
- `handleSubmit`: `const rawHTML = pasteHTML.trim()` (removed `uploadedHTML ||` prefix)
- Header subtitle: "Cole o HTML da revisão de prova abaixo." (removed "ou carregue o arquivo salvo")
- Mode toggle + Corrigir prova button now scoped inside `tab === "html"` branch

---

## What Plan 02 Needs to Do

Plan 02 should replace the `tab === "photo"` branch placeholder with:

1. A hidden `<input type="file" accept="image/*" capture="environment" multiple ref={photoInputRef}>` 
2. Thumbnail grid (`grid grid-cols-2 gap-2 sm:grid-cols-3`) for queued images
3. `images` state: `{ file: File, previewUrl: string }[]` (structure for Phase 5 handoff)
4. "+ Adicionar imagem" button (`variant="outline"`, full-width, `Plus` icon) that triggers `photoInputRef.current?.click()`
5. "Extrair Questões" CTA button (`variant="default"`, `size="lg"`, `ArrowRight` icon after text, `disabled={images.length === 0}`)
6. Image remove handler that revokes the object URL and removes from state
7. Error handling per UI-SPEC copywriting contract

The `tab` state, toggle UI, and conditional rendering slot are already in place — Plan 02 only needs to fill the `tab === "photo"` branch.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Flags

None — this plan only removes client-side input paths and adds a stateless tab toggle. No new network endpoints, auth paths, or file access patterns introduced.

---

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `Em construção` placeholder | `app/page.tsx` | ~280 | Intentional — Plan 02 replaces this with Photo Scan tab content |

This stub is intentional per plan design: Plan 01 provides the slot, Plan 02 fills it.

---

## Self-Check: PASSED

- `app/page.tsx` exists and was modified: FOUND
- Commit `b874b3d` exists: FOUND
- `npx tsc --noEmit` exits 0: PASS
- No removed symbols (`uploadedHTML`, `UploadSimple`, etc.) remain in file: PASS
- `tab ===` has 5+ matches: PASS (5 matches)
- Subtitle "Cole o HTML da revisão de prova abaixo." present: PASS (1 match)
