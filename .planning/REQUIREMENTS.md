# Requirements: Corretor UNIP

**Defined:** 2026-04-04
**Core Value:** Given a UNIP test — online via bookmarklet or printed via photo — return the correct answer for every question, fast, with no friction.

## v1 Requirements (Completed)

All shipped in v1 MVP (2026-04-04). See `.planning/milestones/v1-REQUIREMENTS.md`.

## v1.1 Requirements (Abandoned)

Phases 4–6 were never executed. Relevant scope folded into v2.0 (PHOTO-01–05).

## v2.0 Requirements

### Infrastructure

- [ ] **INFRA-01**: PostgreSQL schema with `subscriptions` table (user_token, stripe_customer_id, stripe_subscription_id, status, expires_at) and `payment_events` table (stripe_event_id UNIQUE for idempotency, event_type, payload JSONB) + Drizzle ORM schema + migrations
- [ ] **INFRA-02**: `lib/redis.ts` ioredis singleton for demo flag; `lib/db.ts` Drizzle singleton with postgres driver — both validated in development
- [ ] **INFRA-03**: App deploys as Next.js standalone build, served by nginx with `proxy_buffering off`, managed by PM2; deploy script copies `public/` + `.next/static/` into `.next/standalone/`

### Access Control

- [ ] **ACCESS-01**: User receives anonymous `cid` cookie (UUID, HttpOnly, SameSite=None, Secure, 2-year expiry) on first visit to corretor.app via `proxy.ts`
- [ ] **ACCESS-02**: After 1 free solve, `/api/solve` returns HTTP 402; client shows paywall prompt directing user to `/assinar`
- [ ] **ACCESS-03**: Demo flag is written in `route.ts` after streaming completes; active subscribers bypass the gate via PostgreSQL subscription status check

### Payment

- [ ] **PAY-01**: User can initiate a Stripe Checkout session for an R$9,90/mês card subscription
- [ ] **PAY-02**: User can pay via PIX Automático through Stripe (bank-app mandate; ceiling set at ~R$15 to survive price/tax changes)
- [ ] **PAY-03**: Stripe webhook handler processes `invoice.paid`, `mandate.updated`, and `customer.subscription.deleted` — updates PostgreSQL status; idempotent via `payment_events`; uses `req.text()` for HMAC verification

### Marketing / Onboarding

- [ ] **MKT-01**: Landing page at `/` — hero, two input modes, how-it-works, privacy section, pricing (from handoff design)
- [ ] **MKT-02**: Onboarding page at `/instalar` — 3-step bookmarklet install flow
- [ ] **MKT-03**: Paywall page at `/assinar` — plan details + initiates Stripe Checkout

### Bookmarklet v2

- [ ] **BM-01**: Bookmarklet v2 POSTs enriched HTML to `corretor.app/api/solve` and injects a Shadow DOM answer panel inside the AVA page (isolated styles, `all: initial` on `:host`)
- [ ] **BM-02**: Desktop overlay uses fixed-right sidebar (~360px); mobile uses bottom sheet
- [ ] **BM-03**: Overlay renders answers progressively as ndjson streams in
- [ ] **BM-04**: Overlay shows subscribe prompt when 402 is received (demo exhausted)

### Photo Flow

- [ ] **PHOTO-01**: User can upload one or more image files (JPG/PNG/HEIC) for photo scan
- [ ] **PHOTO-02**: User can capture a photo via device camera (mobile browser)
- [ ] **PHOTO-03**: App sends images to `/api/extract`; Gemini returns `ParsedQuestion[]`
- [ ] **PHOTO-04**: User can review extracted questions before solving
- [ ] **PHOTO-05**: User can retry extraction if it fails or returns unusable output

## Future Requirements

- **RATE-01**: Per-token sliding window rate limit via atomic Lua script (Redis INCR + conditional EXPIRE)
- **DASH-01**: Dashboard at `/painel` — test history stored client-side (localStorage)
- **UX-01**: Toggle solve mode after results without re-parsing
- **UX-02**: Copy gabarito to clipboard
- **PROV-01**: Provider selector UI (Gemini / Claude / OpenAI)

## Out of Scope (v2.0)

| Feature | Reason |
|---------|--------|
| User accounts / login | Anonymous cookie sufficient for MVP gating |
| Rate limiting | Deferred — demo gate limits exposure; add post-launch |
| Dashboard / test history | Deferred — client-side UX sufficient for MVP |
| URL-based HTML fetching | UNIP portal requires login; bookmarklet avoids proxy |
| Multi-model provider selector | Deferred — solve engine hardening post-PMF |
| Tool-calling for math questions | Deferred — post-PMF hardening |
| Email for PIX mandate revocation | Deferred — no email infra yet |
| OBS-01, OBS-02 | Abandoned v1.1 observability requirements — not in v2.0 scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | TBD | Pending |
| INFRA-02 | TBD | Pending |
| INFRA-03 | TBD | Pending |
| ACCESS-01 | TBD | Pending |
| ACCESS-02 | TBD | Pending |
| ACCESS-03 | TBD | Pending |
| PAY-01 | TBD | Pending |
| PAY-02 | TBD | Pending |
| PAY-03 | TBD | Pending |
| MKT-01 | TBD | Pending |
| MKT-02 | TBD | Pending |
| MKT-03 | TBD | Pending |
| BM-01 | TBD | Pending |
| BM-02 | TBD | Pending |
| BM-03 | TBD | Pending |
| BM-04 | TBD | Pending |
| PHOTO-01 | TBD | Pending |
| PHOTO-02 | TBD | Pending |
| PHOTO-03 | TBD | Pending |
| PHOTO-04 | TBD | Pending |
| PHOTO-05 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 21 total
- Mapped to phases: TBD (roadmapper assigns)
- Unmapped: 21

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 — v2.0 milestone requirements defined*
