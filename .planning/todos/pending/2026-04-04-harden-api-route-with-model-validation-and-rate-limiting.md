---
created: 2026-04-04T13:36:28.204Z
title: Harden API route with model validation and rate limiting
area: api
files:
  - app/api/solve/route.ts
---

## Problem

Two production-readiness gaps in the solve route before this can be deployed reliably:

1. **Model existence not validated at startup.** `MODELS.full` and `MODELS.lite` are Gemini preview/experimental models. Preview models get deprecated without notice. Currently, a missing or retired model causes a silent runtime failure rather than a clear startup error.

2. **No rate limit enforcement.** Both models have strict RPM/TPM quotas (preview tier). The route currently fires generateObject calls with no gating — if the chosen model hits its quota, requests error silently instead of falling back or waiting gracefully.

## Solution

1. **Startup model validation**
   - On app init (or first request), call the Google AI list-models endpoint (`GET /v1beta/models`) using the configured API key
   - Confirm `MODELS.full` and `MODELS.lite` both appear in the response
   - If either is missing, throw with a clear error message naming the missing model — fail loudly rather than serving bad results

2. **Dynamic rate limit enforcement**
   - Track usage in-process (token-bucket or leaky-bucket per model)
   - On each `generateObject` call, check available capacity for the chosen model
   - If at limit: either wait (with timeout) or fall back to the other model tier
   - Consider fetching current quota state from the Google AI quota API if available, rather than tracking from scratch
