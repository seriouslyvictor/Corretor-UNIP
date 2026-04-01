# External Integrations

_Last updated: 2026-03-31_

## Summary

The codebase is currently in its scaffold stage with no active external integrations wired up. No `.env` files are present and no third-party API clients are installed. The architecture plan (`docs/ARCHITECTURE.md`) specifies a single planned integration: an LLM provider accessed via the Vercel AI SDK, defaulting to Google Gemini but designed for easy provider swapping. There is no database, auth provider, file storage, or monitoring service.

## Details

### APIs & External Services

**AI / LLM (Planned — not yet implemented):**
- Google Gemini via `@ai-sdk/google` (default planned provider)
  - SDK/Client: `ai` (Vercel AI SDK core) + `@ai-sdk/google` — neither package is installed yet
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY` environment variable (documented in `docs/ARCHITECTURE.md`, no `.env.local` present)
  - Endpoint: `POST /api/solve` (route file not yet created, planned at `app/api/solve/route.ts`)
  - Usage: `generateObject()` from Vercel AI SDK for structured JSON responses

**Alternative providers (documented as future options, not installed):**
- Anthropic Claude — `@ai-sdk/anthropic`, env var `ANTHROPIC_API_KEY`
- OpenAI — `@ai-sdk/openai`, env var `OPENAI_API_KEY`
- Provider swap is a single-import change per the architecture plan

### Data Storage

**Databases:** None — not applicable. The app is stateless; questions are parsed client-side from user-supplied HTML and sent to the API route per request.

**File Storage:** None — images extracted from UNIP test HTML are handled as base64 data URIs, not uploaded to any storage service.

**Caching:** None — no Redis, Memcached, or edge cache configuration present.

### Authentication & Identity

**Auth Provider:** None — no authentication system is planned or installed. The tool is intended as a single-user utility without accounts.

### Monitoring & Observability

**Error Tracking:** None — no Sentry, Datadog, or equivalent installed.

**Logs:** Next.js default server-side console logging only.

### Fonts

**Next.js Google Fonts (active):**
- `Oxanium` — heading font (`--font-heading` CSS variable)
- `Montserrat` — body/sans font (`--font-sans` CSS variable)
- `Geist_Mono` — monospace font (`--font-mono` CSS variable)
- Loaded via `next/font/google` in `app/layout.tsx` (self-hosted at build time by Next.js — no runtime Google Fonts CDN requests)

### CI/CD & Deployment

**Hosting:** Vercel (implied by architecture decisions; no `vercel.json` or platform config file present)

**CI Pipeline:** None configured.

### Webhooks & Callbacks

**Incoming:** None.

**Outgoing:** None.

### Environment Configuration

**Required env vars (planned, per `docs/ARCHITECTURE.md`):**
- `GOOGLE_GENERATIVE_AI_API_KEY` — Google Gemini API key for the `/api/solve` route

**Secrets location:**
- Intended to live in `.env.local` (not yet created, not committed — correctly gitignored by Next.js defaults)

## Gaps / Unknowns

- No `.env.example` or documented env var list in the repo root — developers must consult `docs/ARCHITECTURE.md` to know what keys are needed
- Vercel AI SDK is not yet installed; the integration exists only as a plan
- No rate limiting or cost-control mechanism is designed for the LLM endpoint
- It is unclear whether the app will be publicly deployed or used as a local personal tool, which affects whether the LLM API key needs protecting behind auth
- No error boundary or fallback behavior is defined for failed LLM calls
