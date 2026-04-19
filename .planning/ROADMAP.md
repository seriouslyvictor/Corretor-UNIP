# Roadmap: Corretor UNIP

## Milestones

- **v1 MVP** - Phases 1-3 (shipped 2026-04-04) — [archive](.planning/milestones/v1-ROADMAP.md)
- **v1.1 Photo Scan Support** - Phases 4-6 (in progress)

## Phases

<details>
<summary>v1 MVP (Phases 1-3) - SHIPPED 2026-04-04</summary>

### Phase 1: Foundation
**Goal**: Parser, schemas, and input UI are wired end-to-end for HTML input
**Plans**: 3 plans (complete)

Plans:
- [x] 01-01: HTML input UI (file upload + paste textarea)
- [x] 01-02: UNIP DOM parser (takeQuestionDiv selectors, ParsedQuestion schema)
- [x] 01-03: Shared Zod schemas (cross-layer contract)

### Phase 2: LLM Integration
**Goal**: Uploaded HTML questions are answered by Gemini via streaming
**Plans**: 3 plans (complete)

Plans:
- [x] 02-01: POST /api/solve streaming route (Gemini 2.5 Flash, ndjson)
- [x] 02-02: No BS / Verbose mode selector + prompt builder
- [x] 02-03: LLM complexity routing (thinkingBudget)

### Phase 3: Gabarito UI
**Goal**: Users see a confidence-colored gabarito grid with full error recovery
**Plans**: 2 plans (complete)

Plans:
- [x] 03-01: Results grid (progressive skeleton + confidence-colored letters)
- [x] 03-02: Verbose cards + error cells with per-question retry

</details>

---

### v1.1 Photo Scan Support (In Progress)

**Milestone Goal:** Allow users to photograph a physical UNIP test paper and get the same gabarito output via Gemini vision extraction.

- [ ] **Phase 4: Photo Input** - User can upload images or capture via camera for photo scan
- [ ] **Phase 5: Vision Extraction** - App extracts ParsedQuestion[] from images via Gemini and lets user review before solving
- [ ] **Phase 6: Observability** - Photo scan flow is fully traceable via debug panel and structured logging
- [ ] **Phase 7: Bookmarklet** - Browser bookmarklet runs on ava.ead.unip.br, inlines images as data-URIs, copies enriched HTML to clipboard

## Phase Details

### Phase 4: Photo Input
**Goal**: User can supply physical test images — via file upload or live camera — ready for extraction
**Depends on**: Phase 3
**Requirements**: INPUT-01, INPUT-02, INPUT-03
**Success Criteria** (what must be TRUE):
  1. User can select one or more JPG/PNG/HEIC image files from their device and see them queued for processing
  2. User on a mobile browser can tap a button to open the device camera and capture a photo directly
  3. User can add more images to cover a multi-page test, and can see all queued images before proceeding
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Tab toggle scaffolding, strip HTML file upload (D-01, D-02)
- [x] 04-02-PLAN.md — Photo Scan tab: image queue, thumbnail grid, camera/file picker (D-03 through D-09, INPUT-01/02/03)

**UI hint**: yes

### Phase 5: Vision Extraction
**Goal**: Uploaded images are sent to Gemini and the extracted questions are reviewable and recoverable before solving
**Depends on**: Phase 4
**Requirements**: VISION-01, VISION-02, VISION-03
**Success Criteria** (what must be TRUE):
  1. App sends queued images to /api/extract and receives a ParsedQuestion[] that feeds into the existing /api/solve flow
  2. User sees the extracted questions displayed before solving starts and can confirm or reject them
  3. User can trigger a re-extraction if the initial result is empty, malformed, or clearly wrong
**Plans**: TBD
**UI hint**: yes

### Phase 6: Observability
**Goal**: Photo scan inputs and extraction calls are traceable for debugging bad outputs
**Depends on**: Phase 5
**Requirements**: OBS-01, OBS-02
**Success Criteria** (what must be TRUE):
  1. Each extraction attempt shows which image(s) were sent, so a bad output can be traced to a specific image
  2. Server logs capture upload receipt, extract request, extract response, and solve handoff at the same verbosity as the existing HTML flow
  3. Client logs mirror server-side events so the full scan lifecycle is visible in browser devtools
**Plans**: TBD

### Phase 7: Bookmarklet
**Goal**: Browser bookmarklet runs on ava.ead.unip.br, inlines all question images as data-URIs into the page HTML, and copies the enriched HTML to clipboard — enabling Corretor to receive pre-fetched image data and bypassing the CORS 401 error in the HTML paste flow
**Depends on**: Phase 1 (parser already handles data-URIs)
**Success Criteria** (what must be TRUE):
  1. User can drag the bookmarklet to their browser toolbar from a Corretor instructions page
  2. Clicking the bookmarklet on a UNIP review page inlines all `<img>` sources as base64 data-URIs and copies the resulting HTML to clipboard
  3. Pasting that clipboard content into Corretor produces image-aware AI answers (no CORS warning, no 401 errors)
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — Bookmarklet source file (chunked btoa IIFE, clipboard write + execCommand fallback)
- [ ] 07-02-PLAN.md — Instructions page at /bookmarklet (drag anchor, CSP warning, layout)

## Progress

**Execution Order:** Phases execute in numeric order: 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1 MVP | 3/3 | Complete | 2026-04-03 |
| 2. LLM Integration | v1 MVP | 3/3 | Complete | 2026-04-03 |
| 3. Gabarito UI | v1 MVP | 2/2 | Complete | 2026-04-04 |
| 4. Photo Input | v1.1 | 0/2 | Planned | - |
| 5. Vision Extraction | v1.1 | 0/TBD | Not started | - |
| 6. Observability | v1.1 | 0/TBD | Not started | - |
| 7. Bookmarklet | v1.1 | 1/2 | In Progress | - |

---
*Last updated: 2026-04-19 — Phase 7 planned (2 plans)*
