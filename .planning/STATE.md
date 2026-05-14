---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Corretor SaaS
status: Roadmap approved, beginning Phase 8
stopped_at: Phase 8 context gathered
last_updated: "2026-05-14T02:42:53.527Z"
last_activity: 2026-05-13 — v2.0 roadmap created (7 phases, 21 requirements)
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

**Project:** Corretor UNIP
**Milestone:** v2.0 Corretor SaaS
**Updated:** 2026-05-13

## Current Position

Phase: Not started (roadmap defined — ready to plan Phase 8)
Plan: —
Status: Roadmap approved, beginning Phase 8
Last activity: 2026-05-13 — v2.0 roadmap created (7 phases, 21 requirements)

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Carry-forward from v1/v1.1:

- Images use `{ type: 'image', image: base64String, mimeType: 'image/png' }` in AI SDK message parts
- Bookmarklet IIFE uses chunked btoa for large pages; clipboard write + execCommand fallback
- Solve engine (/api/solve) is stable — v2.0 wires the bookmarklet overlay to it unchanged

v2.0 architecture decisions:

- `proxy.ts` (not `middleware.ts`) — Next.js 16.1.7 uses new proxy convention; run codemod before starting Phase 9
- ioredis over @upstash/redis — HTTP overhead unacceptable on self-hosted VPS; TCP persistent connection
- Drizzle ORM over Prisma — ~7 KB bundle vs 1.6 MB; TypeScript-native; SDL overhead avoided
- iron-session for cid cookie — AES-GCM encrypted HttpOnly cookie; avoids rolling a custom signing scheme
- Stripe Checkout (hosted) over embedded — CPF collection handled automatically; no extra UI work
- Gate (Phase 12) MUST come after Stripe (Phase 10) — activating gate before payment locks all users out permanently
- Demo flag written in route.ts after stream close — never in proxy (proxy cannot know if solve succeeded)
- nginx proxy_buffering off + X-Accel-Buffering: no required for streaming to work in production

### Pending Todos

None.

### Roadmap Evolution

- v1.1 phases 4-6 (photo scan) abandoned — scope folded into v2.0 as Phase 14
- v2.0 starts at Phase 8 (continuing numbering from v1.1 Phase 7)
- Phase 11 (marketing) can execute in parallel with Phase 10 (Stripe) after Phase 9 ships

### Blockers/Concerns

Open questions from research (resolve before the blocking phase):

- CPF (individual) or CNPJ (company) for Stripe Brazil account? Cannot be changed after creation. [blocks Phase 10]
- Is Stripe account Brazil-registered? PIX Automático may require BR entity; verify with Stripe support. [blocks Phase 10]
- Does `ava.ead.unip.br` send a `connect-src 'self'` CSP header? If yes, bookmarklet v2 fetch is browser-blocked. Check DevTools Network on any AVA page. [blocks Phase 13]
- What is the final production domain? Cookie Domain and CORS allowlist are hardcoded. [blocks Phase 9]
- Free tier: 1 solve or 2 solves? Affects Redis schema (flag vs counter). [blocks Phase 12]

## Session Continuity

Last session: 2026-05-14T02:42:52.903Z
Stopped at: Phase 8 context gathered
Resume file: .planning/phases/08-data-layer/08-CONTEXT.md
