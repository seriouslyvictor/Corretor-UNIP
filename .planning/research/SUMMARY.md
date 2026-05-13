# Research Summary: Corretor UNIP v2.0 SaaS

## Stack Additions

| Library | Version | Rationale |
|---------|---------|-----------|
| `stripe` | `^17.x` | Single gateway for PIX Automático + card; avoids second SDK |
| `@stripe/stripe-js` | `^9.4.0` | Client-side Stripe.js for hosted Checkout redirect |
| `iron-session` | `^8.0.4` | AES-GCM encrypted HttpOnly cookie for anonymous `cid` token |
| `ioredis` | `^5.4.1` | Persistent TCP to local Redis (Upstash rejected — HTTP overhead on self-hosted VPS) |
| `drizzle-orm` | `^0.45.2` | TypeScript-native ORM, ~7 KB; Prisma rejected (1.6 MB bundle + SDL overhead) |
| `postgres` | `^3.4.x` | Drizzle-recommended Node.js PG driver |
| `drizzle-kit` | `^0.30.x` | Dev CLI for migrations and Drizzle Studio |
| PostHog | hosted | LGPD-safe activation tracking; GA4 rejected (cookie banner overhead) |
| PM2 | `^7.0.1` | Process management + zero-downtime reload on VPS |

**Do not add:** NextAuth, Pagar.me/Asaas, `@upstash/redis`, Prisma, `@stripe/react-stripe-js`, Docker, BullMQ.

## Feature Table Stakes

### Payment
- Stripe Checkout hosted page (subscription mode), PIX Automático + card, R$9,90/mês
- CPF collection handled automatically by Stripe Checkout
- Webhooks: `invoice.paid` → grant, `mandate.updated` → prompt re-auth, `customer.subscription.deleted` → revoke
- 7-day grace period on failed renewal (PIX 3-day retry window — do not lock on `invoice.payment_failed`)
- Stripe Customer Portal link for self-serve cancel/manage

### Access Control
- Anonymous `cid` cookie (UUID, HttpOnly, SameSite=None, Secure, 2-year expiry) issued by `proxy.ts` on first visit
- Redis key `demo:{cid}` — cookie holds only opaque token, never the count
- HTTP 402 from `/api/solve` when demo used and no active subscription
- Subscription status in PostgreSQL `subscriptions` table keyed to `cid`
- Demo-mark written in `route.ts` after successful stream close (never in proxy)

### Overlay / Bookmarklet v2
- Shadow DOM panel injection on AVA page (isolated styles, `all: initial` on `:host`)
- Desktop sidebar (fixed right, ~360 px) + mobile bottom sheet (`@media` inside shadow root)
- ndjson streaming rendered progressively inside panel
- CORS on `/api/solve`: `Access-Control-Allow-Origin: https://ava.ead.unip.br`, `Access-Control-Allow-Credentials: true`
- Paywall state in overlay (402 → "subscribe" link back to Corretor)

### Marketing / Onboarding
- Landing page (`/`) with hero, value prop, "Experimente grátis" CTA
- 3-step visual onboarding at `/instalar`
- Pricing/paywall page at `/assinar` — card + PIX, "Cancele quando quiser"
- Mobile fallback for bookmarklet (copy `javascript:` URI, paste in address bar)

### Infra / Rate Limiting
- Per-token sliding window rate limit (atomic Lua script — INCR + conditional EXPIRE)
- IP as secondary abuse signal only (campus NAT breaks IP-first gating)
- nginx `proxy_buffering off` + `X-Accel-Buffering: no` on `/api/solve`
- Static assets copy step in deploy script (`public/` + `.next/static/` into standalone)
- NTP synchronized on VPS (required for Stripe HMAC signature verification)

## Architecture Highlights

### Next.js 16: `middleware.ts` → `proxy.ts`
Next.js 16.1.7 (already running) uses `proxy.ts` exported as `proxy()`. Runs on Node.js runtime — ioredis and postgres connect directly. Codemod: `npx @next/codemod@canary middleware-to-proxy .`

### 6-Phase Build Order

```
A  Data layer       lib/schema.sql, lib/db.ts, lib/redis.ts, env wiring
   └── B  proxy.ts  cid cookie issuance + CORS headers only (no gate yet)
           ├── C  Stripe   checkout/create, webhooks/stripe, /assinar page
           │   └── D  Gate   proxy.ts gate logic + route.ts demo-mark
           │       └── F  Bookmarklet v2   overlay, POSTs to /api/solve
           └── E  Marketing pages  ← parallel with C after B ships
```

Never activate the gate (D) before Stripe (C) is wired — all users get locked out permanently.

### 3 Critical Integration Points

1. **`proxy.ts` cookie issuance** — First visit → UUID → `cid` cookie with `SameSite=None; Secure; HttpOnly; 2-year MaxAge`. The entire identity chain hangs here.
2. **CORS + SameSite=None** — Bookmarklet POSTs from `ava.ead.unip.br` with `credentials: "include"`. Must respond with exact origin (never `*`) and `Allow-Credentials: true`. Validate with a manual `fetch()` from AVA console before building overlay.
3. **Demo-mark in `route.ts`** — `redis.set("demo:{cid}", "used")` fires after successful stream close. Proxy cannot know if solve succeeded — marking in proxy creates false positives.

### New vs Modified Files

**New:** `proxy.ts`, `lib/db.ts`, `lib/redis.ts`, `lib/schema.sql`, `app/api/webhooks/stripe/route.ts`, `app/api/checkout/create/route.ts`, `app/assinar/page.tsx`, `app/instalar/page.tsx`, `app/painel/page.tsx`, `app/(marketing)/page.tsx`, `public/bookmarklet-v2-source.js`, `next.config.ts`, `ecosystem.config.cjs`

**Modified:** `app/api/solve/route.ts` (demo-mark), `app/page.tsx` → moves to `app/corretor/page.tsx`, `app/bookmarklet/page.tsx` (v2 instructions)

**Unchanged:** `lib/parser.ts`, `lib/router.ts`, `lib/schemas.ts`

## Watch Out For

Ordered by production-breaking severity.

1. **Stripe webhook raw body** — Always `req.text()`, never `req.json()` in the webhook route. Calling `.json()` first destroys the bytes needed for HMAC verification. Most reported Stripe + Next.js failure.
2. **nginx buffers the streaming response** — `proxy_buffering off` + `X-Accel-Buffering: no` required. Without it, the entire LLM response accumulates before the client sees anything — silently breaks streaming in production.
3. **PIX mandate revocation fires `mandate.updated`** — Not `customer.subscription.deleted`. Without this handler, subscription stays `active` in DB while Stripe can no longer charge. Silent revenue leak.
4. **Redis rate limit race condition** — `INCR` + `EXPIRE` as two commands can create a permanently non-expiring counter if process crashes between them. Use atomic Lua script: INCR + conditional EXPIRE in a single `EVAL`.
5. **Standalone build missing static assets** — `next build` with `output: 'standalone'` excludes `public/` and `.next/static/`. Every deploy must copy both into `.next/standalone/`. No error in build log — silent 404s in production.

## Open Questions

| Question | Blocking Phase |
|----------|---------------|
| CPF (individual) or CNPJ (company) for Stripe Brazil account? Cannot be changed after creation. | Phase C — Stripe setup |
| Is Stripe account Brazil-registered? PIX Automático may require BR entity; verify with Stripe support. | Phase C — Stripe setup |
| Does `ava.ead.unip.br` send a `connect-src 'self'` CSP header? If yes, bookmarklet v2 fetch is browser-blocked. Check DevTools → Network → CSP on any AVA page. | Phase F — Bookmarklet v2 |
| What is the final production domain? Cookie `Domain` and CORS allowlist are hardcoded. | Phase B — proxy.ts |
| Free tier: 1 solve or 2 solves? Affects Redis schema (flag vs counter). | Phase D — Gate logic |

---
*Generated: 2026-05-13 from 4 parallel research agents*
