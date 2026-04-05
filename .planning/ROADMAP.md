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

## Phase Details

### Phase 4: Photo Input
**Goal**: User can supply physical test images — via file upload or live camera — ready for extraction
**Depends on**: Phase 3
**Requirements**: INPUT-01, INPUT-02, INPUT-03
**Success Criteria** (what must be TRUE):
  1. User can select one or more JPG/PNG/HEIC image files from their device and see them queued for processing
  2. User on a mobile browser can tap a button to open the device camera and capture a photo directly
  3. User can add more images to cover a multi-page test, and can see all queued images before proceeding
**Plans**: TBD
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

## Progress

**Execution Order:** Phases execute in numeric order: 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1 MVP | 3/3 | Complete | 2026-04-03 |
| 2. LLM Integration | v1 MVP | 3/3 | Complete | 2026-04-03 |
| 3. Gabarito UI | v1 MVP | 2/2 | Complete | 2026-04-04 |
| 4. Photo Input | v1.1 | 0/TBD | Not started | - |
| 5. Vision Extraction | v1.1 | 0/TBD | Not started | - |
| 6. Observability | v1.1 | 0/TBD | Not started | - |

---
*Last updated: 2026-04-04 — v1.1 roadmap created*
