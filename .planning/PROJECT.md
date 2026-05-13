# Corretor UNIP

## What This Is

An AI-powered test-solving mini-SaaS for UNIP students. A bookmarklet runs inside the UNIP AVA portal, reads the test questions client-side, and overlays answers. A photo flow handles printed tests. One free demo test; then R$9,90/mês.

## Core Value

Given a UNIP test — online via bookmarklet or printed via photo — return the correct answer for every question, fast, with no friction.

## Current State

**Shipped:** v1 MVP (2026-04-04) + v1.1 bookmarklet (2026-04-19)

The full v1 solve flow is working end-to-end:
- HTML input (file upload + paste textarea) with client-side parsing
- POST /api/solve streaming route (Gemini 2.5 Flash, ndjson, avoids 10s timeout)
- No BS mode (answer only) and Verbose mode (answer + explanation per question)
- Gabarito grid with progressive skeleton fill and confidence-colored letters
- LLM complexity routing (fact-recall vs reasoning via thinkingBudget)
- Bookmarklet that runs on ava.ead.unip.br, inlines images as data-URIs, copies enriched HTML to clipboard

## Current Milestone: v2.0 Corretor SaaS

**Goal:** Ship Corretor as a public-facing freemium SaaS — bookmarklet-first, mobile-ready, with Brazilian payment integration and the infra safeguards needed for a product in the wild.

**Target features:**
- Landing page (corretor.app) — marketing, pricing, privacy promise, FAQ
- Onboarding (corretor.app/instalar) — 3-step bookmarklet install flow
- Bookmarklet overlay — answer panel injected inside UNIP AVA; desktop sidebar + mobile bottom sheet layouts
- Paywall (corretor.app/assinar) — triggered after 1 free demo; Stripe card + PIX
- Access control — anonymous token (cookie) tracks free use; gates further solves without accounts
- Dashboard (corretor.app/painel) — test history stored client-side
- Photo flow — redesigned capture → Gemini extraction → answers
- VPS deployment — PostgreSQL (subscriptions, events) + Redis (rate limits, anonymous sessions)
- Safeguards — rate limiting, abuse prevention for public exposure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vercel AI SDK over direct Gemini SDK | Provider-agnostic — swap model with one import | Validated |
| streamText + Output.array() over generateObject | generateObject deprecated in AI SDK 6; structured streaming still achievable | Validated |
| Client-side parsing, server-side LLM | DOMParser available in browser; LLM key stays server-side | Validated |
| LLM routing for think vs. recall | Avoid wasting reasoning tokens on pure memorization questions | Validated |
| thinkingBudget: -1 (Verbose) / 0 (No BS) | Dynamic reasoning for complex; zero for pure recall | Validated |
| Custom ReadableStream for streaming | toDataStreamResponse() not available in ai@6.0.145 | Validated |
| Bookmarklet inlines images as data-URIs | Bypasses CORS 401 on UNIP image CDN | Validated |
| Stripe + PIX for payment | Stripe handles subscriptions; PIX is table stakes for Brazilian students | Decided v2.0 |
| Anonymous cookie token for free-use gate | No signup friction for demo; token persists until paywall hit | Decided v2.0 |
| VPS over Vercel for v2.0 | Redis + PostgreSQL needed; existing VPS avoids managed service costs | Decided v2.0 |
| Solve engine unchanged for MVP | Accuracy is good enough; hardening deferred until user interest validated | Decided v2.0 |

## Constraints

- **Tech Stack**: Next.js 15 + Vercel AI SDK + shadcn/ui + Tailwind v4
- **LLM Provider**: Google Gemini via `@ai-sdk/google` (multimodal)
- **Infra**: Self-hosted VPS with Redis + PostgreSQL
- **Payment**: Stripe subscriptions + PIX (Brazil)
- **Design**: Dark theme (#050507), emerald accent (#00d992), Inter + JetBrains Mono — from handoff zip

## Context

- v1 solve engine is the beating heart — bookmarklet sends enriched HTML to /api/solve unchanged
- UNIP take-test DOM: `div.takeQuestionDiv` → `h3.steptitle` → `legend.legend-visible` → `table.multiple-choice-table`
- Bookmarklet inlines `<img>` src as base64 data-URIs before copying HTML to clipboard
- v1.1 photo scan phases (4-6) were abandoned; photo flow is re-scoped under v2.0

## Active Requirements

See `.planning/REQUIREMENTS.md` — v2.0 section.

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / login | Anonymous token sufficient for MVP gating |
| URL-based HTML fetching | UNIP portal requires login; bookmarklet avoids proxy |
| Multi-model provider selector UI | Deferred — solve engine hardening post-PMF |
| Tool-calling for math questions | Deferred — post-PMF hardening |
| Server-side test history | Client-side storage sufficient for MVP |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

<details>
<summary>v1 / v1.1 Planning History</summary>

- Phase 1: Foundation — parser, schemas, input UI (completed 2026-04-03)
- Phase 2: LLM Integration — /api/solve, streaming, modes, routing (completed 2026-04-03)
- Phase 3: Gabarito UI — results grid, verbose cards, loading/error states (completed 2026-04-04)
- Phase 7: Bookmarklet — data-URI inliner + /bookmarklet instructions page (completed 2026-04-19)
- Phases 4-6 (photo scan) abandoned — scope folded into v2.0
- Full archive: `.planning/milestones/v1-ROADMAP.md`

</details>

---
*Last updated: 2026-05-13 — milestone v2.0 started*
