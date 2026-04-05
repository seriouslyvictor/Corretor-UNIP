# Requirements: Corretor UNIP

**Defined:** 2026-04-04
**Core Value:** Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.

## v1 Requirements (Completed)

All shipped in v1 MVP (2026-04-04). See `.planning/milestones/v1-REQUIREMENTS.md`.

## v1.1 Requirements

### Input Mode

- [ ] **INPUT-01**: User can upload one or more image files (JPG/PNG/HEIC) for photo scan
- [ ] **INPUT-02**: User can capture a photo directly via device camera (mobile browser)
- [ ] **INPUT-03**: User can upload multiple images to cover a multi-page test

### Vision Extraction

- [ ] **VISION-01**: App sends uploaded images to a new `/api/extract` route; Gemini returns `ParsedQuestion[]`
- [ ] **VISION-02**: User can review the extracted questions before solving to verify accuracy
- [ ] **VISION-03**: User can retry extraction if it fails or returns unusable output

### Observability

- [ ] **OBS-01**: App stores/displays which images were sent to each Gemini extraction call (debug panel or log entry) so bad outputs can be traced to their source image
- [ ] **OBS-02**: Server and client logging covers the photo scan flow (upload, extract request, extract response, solve handoff) with the same patterns as the existing HTML flow

## Future Requirements

### UX Polish

- **UX-01**: Toggle mode after results without re-parsing
- **UX-02**: Copy gabarito to clipboard

### Deployment

- **DEPLOY-01**: Vercel production deployment

### Provider

- **PROV-01**: Provider selector UI (Gemini / Claude / OpenAI)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database / persistence | Stateless MVP — no user data stored |
| Authentication / user accounts | Single-user local tool |
| URL-based HTML fetching | UNIP portal requires login; file upload avoids auth complexity |
| Multiple simultaneous LLM providers | Single provider per deploy; swappable via one import |
| OCR-only pipeline (no LLM) | Gemini vision handles both extraction and understanding in one step |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 4 | Pending |
| INPUT-02 | Phase 4 | Pending |
| INPUT-03 | Phase 4 | Pending |
| VISION-01 | Phase 5 | Pending |
| VISION-02 | Phase 5 | Pending |
| VISION-03 | Phase 5 | Pending |
| OBS-01 | Phase 6 | Pending |
| OBS-02 | Phase 6 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 — v1.1 roadmap created, all requirements mapped*
