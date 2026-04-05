---
created: 2026-04-04T13:36:28.204Z
title: Harden API route with model validation and rate limiting
area: api
files:
  - app/api/solve/route.ts
  - lib/router.ts
---

## Problem

Two production-readiness gaps in the solve route before this can be deployed reliably:

1. **Model existence not validated at startup.** `MODELS.full` and `MODELS.lite` are Gemini preview/experimental models. Preview models get deprecated without notice. Currently, a missing or retired model causes a silent runtime failure rather than a clear startup error.

2. **No rate limit enforcement.** Both models have strict RPM/TPM/RPD quotas (preview free tier). The route currently fires generateObject calls with no gating — quota exhaustion causes silent errors. The classifier also calls the lite model, so a 20-question test = ~40 lite calls.

**Binding constraint:** 500 RPD (not 15 RPM) — at ~40 calls/test, that's ~12 tests/day total across all users on the free tier.

## Solution — Phased

### Now: Option A — Reactive (429-driven)

- `instrumentation.ts` on startup: `GET /v1beta/models`, confirm `MODELS.full` and `MODELS.lite` are present, throw loud error if missing
- In `route.ts` catch block: detect 429 status, exponential backoff + retry (up to N attempts)
- Stream a visible "rate limited, retrying…" status to the client rather than silently waiting
- No external dependencies

### v2: Option E + C — Per-user keys + Self-hosted Redis

**Two usage tiers for paying users:**
- **Self-managed**: user provides their own Gemini API key → their quota, their problem
- **Managed**: we provide the key, charge ~R$9.90/month to cover API costs

**Rate limiting (managed users):**
- Redis token bucket tracking rpm + rpd counters per model, with TTL
- Self-hosted Redis on existing VPS (already running with domain) — no Upstash needed, no command limits, no cold-start penalty
- Return 503 + `Retry-After` header to client when quota exceeded (proactive vs. silent retry)
- Switch to paid Gemini limits later by changing one constant

## Key decisions from brainstorm

- Google AI quota API not available for free-tier API keys (Cloud Quotas API requires OAuth + GCP project)
- Dynamic quota fetching from AI Studio page not viable (not a stable API)
- 429 is ground truth — hardcode known limits as first-line defense, let 429 correct them
- Self-hosted Redis preferred over Upstash: no limits, lower latency, already have the VPS
- In-process token bucket skipped — resets on Vercel cold starts, not suitable for multi-user public app
