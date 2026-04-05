# Phase 4: Photo Input - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

User can supply physical test images — via file upload or live camera capture — and see them queued in a thumbnail grid before proceeding to extraction. No extraction, no review step — those are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Input Mode Layout
- **D-01:** Add a tab toggle to the existing input section: "HTML" tab | "Photo Scan" tab. Same page, same layout structure.
- **D-02:** Remove the HTML file upload option from the HTML tab — keep paste textarea only. File upload had too much friction to be useful.

### Camera Capture
- **D-03:** Use native OS picker via `<input type="file" accept="image/*" capture="environment">` — no custom in-page camera preview. Zero friction, works on all mobile browsers.
- **D-04:** Same input element also handles file upload for users who already have images saved (capture attribute is a hint, not a hard constraint — desktop users see normal file picker).

### Image Queue Display
- **D-05:** Thumbnail grid with object-URL previews. Each thumbnail shows the image and an ✕ remove button.
- **D-06:** No page labels (Page 1, Page 2) — images are ordered by add sequence, user knows order.
- **D-07:** "Extract Questions →" CTA button below the grid. Disabled or hidden until at least one image is queued.

### Multi-Image Add Flow
- **D-08:** "+ Add image" button below the thumbnail grid — opens the same file/camera picker. No drag-and-drop (not mobile-friendly).
- **D-09:** No hard limit on image count; the UI accommodates any reasonable test length.

### Claude's Discretion
- Exact thumbnail size and grid column count (adapt to viewport)
- Whether "Photo Scan" tab shows an empty state illustration or just the "+ Add image" button immediately
- Exact button labels (Portuguese vs English — follow existing convention in `page.tsx`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current input implementation
- `app/page.tsx` — Full current input section, tab structure, drag-and-drop pattern, file reading logic. **Read this first** — new Photo Scan tab wraps into this component.

### Requirements
- `.planning/REQUIREMENTS.md` §v1.1 Requirements > Input Mode — INPUT-01, INPUT-02, INPUT-03 acceptance criteria
- `.planning/ROADMAP.md` §Phase 4 — Success criteria (3 items) and UI hint flag

### Existing components available
- `components/ui/card.tsx` — Card/CardContent for thumbnail wrapper
- `components/ui/button.tsx` — Button for add/extract CTAs
- `components/gabarito-grid.tsx` — Reference for how existing result components are structured

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/page.tsx` — `readFile()` function and `<input ref={fileInputRef}>` pattern: reuse for image file reading (swap `.html` check for image MIME type check)
- `components/ui/card.tsx` — Use for thumbnail cards in the queue grid
- `components/ui/button.tsx` — Use for "+ Add image" and "Extract Questions →" CTAs
- `@phosphor-icons/react` — Already installed; use for ✕ (X), camera, and upload icons

### Established Patterns
- State machine: `PageState = "input" | "results"` — photo input lives in "input" state alongside HTML tab
- `"use client"` directive with `useState`/`useRef` — same pattern for photo queue state
- Error messages in Portuguese (e.g., "Apenas arquivos .html são aceitos.") — follow same locale for image error messages
- Tailwind + shadcn — no new styling dependencies

### Integration Points
- `page.tsx` input section — Photo Scan tab added here; tab selection state (`"html" | "photo"`) added to existing component state
- Phase 5 will read the queued images from state (array of `File` objects or base64 strings) — structure the queue state with Phase 5 in mind: `{ file: File, previewUrl: string }[]`

</code_context>

<specifics>
## Specific Ideas

- "Remove the HTML file selection option — this feature has too much friction to be usable" → HTML tab: paste-only from now on.
- Camera input should use `capture="environment"` to default to rear camera on mobile (physical test paper facing down is front, so environment is correct).

</specifics>

<deferred>
## Deferred Ideas

- Drag-and-drop for images — not needed (mobile-first, button is sufficient)
- Page number labels on thumbnails — not needed at this stage
- Custom in-page camera preview — Phase 5 or later polish

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-photo-input*
*Context gathered: 2026-04-04*
