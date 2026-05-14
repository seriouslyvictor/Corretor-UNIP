# Roadmap: Corretor UNIP

## Milestones

- **v1 MVP** - Phases 1-3 (shipped 2026-04-04) — [archive](.planning/milestones/v1-ROADMAP.md)
- **v1.1 Bookmarklet** - Phase 7 (shipped 2026-04-19) — Phases 4-6 abandoned; scope folded into v2.0
- **v2.0 Corretor SaaS** - Phases 8-14 (in progress)

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

<details>
<summary>v1.1 Bookmarklet (Phase 7) - SHIPPED 2026-04-19</summary>

### Phase 7: Bookmarklet
**Goal**: Browser bookmarklet runs on ava.ead.unip.br, inlines all question images as data-URIs into the page HTML, and copies the enriched HTML to clipboard
**Plans**: 2 plans (complete)

Plans:
- [x] 07-01-PLAN.md — Bookmarklet source file (chunked btoa IIFE, clipboard write + execCommand fallback)
- [x] 07-02-PLAN.md — Instructions page at /bookmarklet (drag anchor, CSP warning, layout)

</details>

---

### v2.0 Corretor SaaS (Phases 8-14)

**Milestone Goal:** Ship Corretor as a public-facing freemium SaaS — bookmarklet-first, mobile-ready, with Brazilian payment integration and the infra safeguards needed for a product in the wild.

- [ ] **Phase 8: Data Layer** - PostgreSQL schema, Drizzle ORM, and Redis singleton are wired and validated in development
- [ ] **Phase 9: Proxy & CORS** - `cid` cookie is issued on first visit; `/api/solve` accepts cross-origin requests from AVA with credentials
- [ ] **Phase 10: Stripe & Paywall** - User can subscribe via card or PIX; webhook handler keeps PostgreSQL subscription state current
- [ ] **Phase 11: Marketing Pages** - Landing page, install guide, and paywall page are live and functional
- [ ] **Phase 12: Gate Logic** - Demo gate is active; one free solve is enforced; subscribers bypass the gate
- [ ] **Phase 13: Bookmarklet v2** - Shadow DOM overlay injects answers inside AVA; desktop sidebar and mobile bottom sheet layouts work; 402 shows subscribe prompt
- [ ] **Phase 14: Photo Flow** - User can upload or capture images of a printed test and receive a full gabarito

## Phase Details

### Phase 8: Data Layer
**Goal**: PostgreSQL schema and Redis singleton are wired, migrated, and validated in development — the persistence foundation for every downstream phase
**Depends on**: Nothing (first v2.0 phase)
**Requirements**: INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. Running `drizzle-kit migrate` applies the `subscriptions` and `payment_events` tables to the local database with no errors
  2. A test script can write and read a row from `subscriptions` via the Drizzle singleton without runtime errors
  3. A test script can set and get a Redis key via the ioredis singleton without runtime errors
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md -- Install deps, create schema, singletons, drizzle.config.ts, run db:generate + db:migrate
- [ ] 08-02-PLAN.md -- Integration tests for Drizzle and ioredis singletons

### Phase 9: Proxy & CORS
**Goal**: Every visitor receives an anonymous `cid` cookie on first load; `/api/solve` accepts credentialed cross-origin requests from `ava.ead.unip.br`; app deploys to VPS as Next.js standalone behind nginx
**Depends on**: Phase 8
**Requirements**: ACCESS-01, INFRA-03
**Success Criteria** (what must be TRUE):
  1. A first-time visitor to corretor.app receives an HttpOnly `cid` cookie; subsequent visits reuse the same cookie
  2. A manual `fetch('https://corretor.app/api/solve', { credentials: 'include' })` from the AVA browser console returns a non-CORS-error response (the server accepts the cross-origin credentialed request)
  3. The app serves correctly from the VPS via nginx with `proxy_buffering off`; the streaming response reaches the browser progressively (not buffered)
**Plans**: TBD

### Phase 10: Stripe & Paywall
**Goal**: User can initiate and complete a Stripe Checkout subscription; webhook handler processes lifecycle events and keeps PostgreSQL in sync
**Depends on**: Phase 9
**Requirements**: PAY-01, PAY-02, PAY-03, MKT-03
**Success Criteria** (what must be TRUE):
  1. Clicking "Assinar" on `/assinar` redirects user to Stripe Checkout in subscription mode with the correct R$9,90/mês price
  2. Completing checkout (test mode) triggers the webhook; `subscriptions` table shows the token as `active` with a valid `expires_at`
  3. A simulated `customer.subscription.deleted` webhook revokes the subscription status in PostgreSQL
  4. A simulated `mandate.updated` webhook updates the subscription record without duplicate processing (idempotency via `payment_events`)
**Plans**: TBD
**UI hint**: yes

### Phase 11: Marketing Pages
**Goal**: Landing page and install guide are live — visitors can understand the product, get the bookmarklet, and reach the paywall
**Depends on**: Phase 9
**Requirements**: MKT-01, MKT-02
**Success Criteria** (what must be TRUE):
  1. Visiting `/` shows the hero, value prop, how-it-works, privacy section, and pricing — matching the handoff design
  2. Visiting `/instalar` shows a 3-step bookmarklet install flow; the draggable bookmarklet anchor is present and functional
  3. All CTAs on the landing page route correctly (install → `/instalar`, subscribe → `/assinar`, try → solve flow)
**Plans**: TBD
**UI hint**: yes

### Phase 12: Gate Logic
**Goal**: The demo gate is active — anonymous users get exactly one free solve; active subscribers bypass the gate transparently
**Depends on**: Phase 10 (Stripe must be wired before gate is activated)
**Requirements**: ACCESS-02, ACCESS-03
**Success Criteria** (what must be TRUE):
  1. A new visitor's first solve completes normally; attempting a second solve returns HTTP 402 and the client displays a paywall prompt linking to `/assinar`
  2. A user with an active subscription record in PostgreSQL can solve repeatedly without hitting the 402 gate
  3. The demo flag is written only after the streaming response closes successfully — a failed or cancelled solve does not consume the demo
**Plans**: TBD

### Phase 13: Bookmarklet v2
**Goal**: The bookmarklet injects a Shadow DOM answer panel inside AVA; it streams answers progressively and surfaces the paywall when the demo is exhausted
**Depends on**: Phase 12 (gate live), Phase 9 (CORS validated)
**Requirements**: BM-01, BM-02, BM-03, BM-04
**Success Criteria** (what must be TRUE):
  1. Clicking the bookmarklet on a UNIP AVA test page injects an answer panel with isolated styles (no AVA CSS leakage); panel does not break page layout
  2. On desktop, the panel appears as a fixed-right sidebar; on a mobile viewport it appears as a bottom sheet
  3. Answers stream into the panel progressively as the ndjson response arrives — first answers are visible before the last question is processed
  4. When the 402 response is received, the panel shows a subscribe prompt with a link to `/assinar`
**Plans**: TBD
**UI hint**: yes

### Phase 14: Photo Flow
**Goal**: User can photograph or upload images of a printed UNIP test, review the extracted questions, and receive a full gabarito
**Depends on**: Phase 12 (gate applies to photo solves too)
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05
**Success Criteria** (what must be TRUE):
  1. User can select one or more JPG/PNG/HEIC files or capture a photo via device camera from the photo tab
  2. App sends the images to `/api/extract` and displays the extracted questions for user review before solving begins
  3. User can trigger a re-extraction if the result is empty, malformed, or clearly wrong
  4. Confirmed extracted questions feed into the existing `/api/solve` flow and produce a gabarito grid identical to the HTML input path
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** 8 → 9 → 10 → 11 (parallel with 10 after 9) → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1 MVP | 3/3 | Complete | 2026-04-03 |
| 2. LLM Integration | v1 MVP | 3/3 | Complete | 2026-04-03 |
| 3. Gabarito UI | v1 MVP | 2/2 | Complete | 2026-04-04 |
| 4. Photo Input | v1.1 | 0/2 | Abandoned | - |
| 5. Vision Extraction | v1.1 | 0/TBD | Abandoned | - |
| 6. Observability | v1.1 | 0/TBD | Abandoned | - |
| 7. Bookmarklet | v1.1 | 2/2 | Complete | 2026-04-19 |
| 8. Data Layer | v2.0 | 0/TBD | Not started | - |
| 9. Proxy & CORS | v2.0 | 0/TBD | Not started | - |
| 10. Stripe & Paywall | v2.0 | 0/TBD | Not started | - |
| 11. Marketing Pages | v2.0 | 0/TBD | Not started | - |
| 12. Gate Logic | v2.0 | 0/TBD | Not started | - |
| 13. Bookmarklet v2 | v2.0 | 0/TBD | Not started | - |
| 14. Photo Flow | v2.0 | 0/TBD | Not started | - |

---
*Last updated: 2026-05-13 — v2.0 roadmap created (7 phases, 21 requirements)*
