# Architecture: Corretor UNIP v2.0 SaaS Layer

**Researched:** 2026-05-13
**Milestone:** v2.0 — adding SaaS gating to existing Next.js 16.1.7 App Router app on self-hosted VPS
**Confidence:** HIGH (Next.js 16 docs confirmed, Stripe PIX confirmed, CORS patterns confirmed)

---

## Critical Framework Note: Next.js 16 Renames Middleware

The project already runs Next.js 16.1.7. In Next.js 16, `middleware.ts` is **deprecated** and renamed to `proxy.ts` (the exported function also becomes `proxy`). The file runs on the **Node.js runtime** (not Edge), which means ioredis and pg connect directly from the proxy layer — no HTTP-only workarounds needed.

- File location: `proxy.ts` at project root (same level as `app/`)
- Export: `export function proxy(request: NextRequest)`
- Runtime: Node.js (confirmed by Next.js 16 release notes — ioredis compatible)
- Codemod available: `npx @next/codemod@canary middleware-to-proxy .`

**New files use `proxy.ts`. Do not create `middleware.ts`.**

---

## Data Flow

### Current Flow (v1.1)

```
AVA (ava.ead.unip.br)
  └── bookmarklet.js runs
      ├── inlines <img> as base64 data-URIs
      └── copies outerHTML to clipboard

User manually
  └── pastes HTML into corretor.app textarea
      └── parseHTML() (client-side, lib/parser.ts)
          └── POST /api/solve  { mode, questions[] }
              └── solveWithFallback() (lib/router.ts)
                  └── Gemini API (streaming ndjson)
                      └── response streamed to client UI
```

### Target Flow (v2.0)

```
First visit to corretor.app (any page)
  └── proxy.ts runs
      ├── cookie "cid" present? → pass through
      └── no cookie → generate UUID, set cookie "cid"
          SameSite=None; Secure; HttpOnly; Path=/

AVA (ava.ead.unip.br)
  └── bookmarklet-v2.js runs
      ├── inlines <img> as base64 data-URIs (same as v1)
      ├── parseHTML() (IIFE copy of parser logic)
      └── POST https://corretor.app/api/solve
          headers: { "Content-Type": "application/json" }
          credentials: "include"          ← sends "cid" cookie cross-origin
          body: { mode, questions[] }

corretor.app/api/solve (route.ts)
  └── proxy.ts checked first (matcher: /api/solve)
      ├── read "cid" cookie from request
      ├── no "cid" → 401 (client must visit corretor.app first)
      ├── check Redis: GET demo:{cid}
      │   ├── "used" AND no active subscription → 402 redirect /assinar
      │   └── active subscription? → check PostgreSQL
      │       └── subscriptions WHERE user_token=cid AND status='active' AND expires_at > NOW()
      └── allowed → NextResponse.next() (passes to route handler)
          └── route.ts (unchanged solve logic)
              └── streaming ndjson response

Bookmarklet overlay
  └── reads ndjson stream
      └── injects answer panel into AVA DOM
          ├── desktop: sidebar panel
          └── mobile: bottom sheet

Stripe Checkout (one-time PIX or subscription)
  └── User clicks "Assinar" on /assinar
      └── POST /api/checkout/create
          └── stripe.checkout.sessions.create({ payment_method_types: ['pix', 'card'], ... })
              └── redirect to Stripe-hosted checkout
                  └── on success → redirect to corretor.app/painel

Stripe webhook → POST /api/webhooks/stripe
  └── raw body + stripe-signature header
      └── stripe.webhooks.constructEvent(body, sig, secret)
          └── switch(event.type)
              ├── "checkout.session.completed"
              │   └── UPSERT subscriptions
              │       SET status='active', stripe_customer_id, expires_at
              │       WHERE user_token = metadata.cid
              ├── "customer.subscription.updated"
              │   └── UPDATE subscriptions SET status, expires_at
              ├── "customer.subscription.deleted"
              │   └── UPDATE subscriptions SET status='cancelled'
              └── INSERT payment_events (raw JSON, idempotency)
```

---

## New Components

### `proxy.ts` (project root) — NEW
**Responsibilities:**
1. Issue anonymous `cid` cookie on first visit (if absent)
2. Gate `POST /api/solve` — check Redis demo usage, fall through to route handler if allowed
3. Set CORS headers for `/api/solve` for bookmarklet origin (`ava.ead.unip.br`)

**Token origin decision:** The cookie is issued at the proxy layer on **first HTTP visit to corretor.app** (any page). This means:
- User visits `corretor.app` to install the bookmarklet → gets cookie immediately
- Bookmarklet runs on AVA later → sends `credentials: "include"` → cookie arrives at `/api/solve`
- The cookie is `SameSite=None; Secure` so it travels cross-origin (AVA → corretor.app)

**Gate logic (pseudocode):**
```typescript
// proxy.ts
const cid = request.cookies.get("cid")?.value

// Issue cookie if absent (first visit)
if (!cid) {
  const newCid = randomUUID()
  const response = NextResponse.next()
  response.cookies.set("cid", newCid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",       // required for cross-origin bookmarklet
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,  // 2 years
  })
  // CORS headers must also be set here if origin is AVA
  return response
}

// Gate /api/solve only
if (request.nextUrl.pathname === "/api/solve" && request.method === "POST") {
  const used = await redis.get(`demo:${cid}`)
  if (used === "used") {
    const sub = await pg.query(
      "SELECT 1 FROM subscriptions WHERE user_token=$1 AND status='active' AND expires_at > NOW()",
      [cid]
    )
    if (sub.rowCount === 0) {
      return NextResponse.json({ error: "paywall" }, { status: 402 })
    }
  }
}
```

**Rate limit logic:** After a successful solve in `route.ts`, the route handler calls `redis.set("demo:{cid}", "used", "EX", 60*60*24*365)` to mark the demo as consumed. Do not do this in proxy — proxy cannot know if solve succeeded.

### `lib/db.ts` — NEW
Singleton pg Pool (node-postgres). Avoids creating a new connection per request.

```typescript
// lib/db.ts
import { Pool } from "pg"
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export default pool
```

**Dependencies:** `npm install pg @types/pg`

### `lib/redis.ts` — NEW
Singleton ioredis client.

```typescript
// lib/redis.ts
import Redis from "ioredis"
const redis = new Redis(process.env.REDIS_URL!)
export default redis
```

**Dependencies:** `npm install ioredis @types/ioredis` (types bundled in ioredis v5)

### `lib/schema.sql` — NEW
PostgreSQL schema. Run once during deploy.

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id              SERIAL PRIMARY KEY,
  user_token      TEXT NOT NULL UNIQUE,     -- the "cid" cookie value
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status          TEXT NOT NULL DEFAULT 'inactive',  -- active | cancelled | past_due | inactive
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id              SERIAL PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,     -- idempotency key
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  processed_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `app/api/webhooks/stripe/route.ts` — NEW
Stripe webhook handler.

**Key pattern (raw body required for signature):**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.text()           // NOT req.json() — signature breaks
  const sig = req.headers.get("stripe-signature")!
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  // deduplicate via payment_events
  await pg.query(
    "INSERT INTO payment_events (stripe_event_id, event_type, payload) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [event.id, event.type, JSON.parse(body)]
  )

  switch (event.type) {
    case "checkout.session.completed": ...
    case "customer.subscription.updated": ...
    case "customer.subscription.deleted": ...
  }
  return new Response("ok", { status: 200 })
}
```

**Webhook events to subscribe:**
- `checkout.session.completed` — initial payment, activates subscription
- `customer.subscription.updated` — renewal, cancellation, status change
- `customer.subscription.deleted` — hard cancel
- `invoice.payment_failed` — mark as `past_due`

**Matcher exclusion:** `/api/webhooks/stripe` must be excluded from CORS and from the demo gate in `proxy.ts`.

### `app/api/checkout/create/route.ts` — NEW
Creates a Stripe Checkout Session.

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",                    // or "payment" for one-time
  payment_method_types: ["pix", "card"],
  customer_email: undefined,               // anonymous — no email required
  metadata: { cid: cidFromCookie },        // bind payment to anonymous token
  line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
  success_url: `${BASE_URL}/painel?checkout=success`,
  cancel_url: `${BASE_URL}/assinar`,
})
return NextResponse.redirect(session.url!)
```

**PIX note:** PIX is a one-time payment method natively — for subscriptions, Stripe now supports Pix Automático (recurring PIX, introduced April 2026 by Brazil's Central Bank). For MVP, offering PIX as a one-time annual/semi-annual charge and card for monthly subscription is the safest path. Check Stripe dashboard PIX configuration for Brazilian Ebanx routing.

### `app/api/solve/route.ts` — MODIFIED
After each successful solve batch, mark demo as used in Redis:

```typescript
// At end of stream, before controller.close():
const cid = req.cookies.get("cid")?.value
if (cid) {
  await redis.set(`demo:${cid}`, "used", "EX", 60 * 60 * 24 * 365)
}
```

This is the authoritative place to mark demo used — only fires if solve actually completed without throwing.

### `app/(marketing)/page.tsx` — NEW (replaces current `app/page.tsx` as landing)
The current `app/page.tsx` (paste input UI) moves to `app/corretor/page.tsx` or similar. The root `/` becomes the marketing landing page. Route group `(marketing)` keeps it layout-isolated.

### `app/assinar/page.tsx` — NEW
Paywall page. Shows pricing, triggers `/api/checkout/create`.

### `app/painel/page.tsx` — NEW
Dashboard. Test history stored client-side (localStorage). No server fetch needed.

### `app/instalar/page.tsx` — NEW
3-step bookmarklet install flow. Static Server Component.

### `public/bookmarklet-v2-source.js` — NEW
Bookmarklet that POSTs directly to corretor.app instead of copying to clipboard. Includes inline parseHTML equivalent and injects DOM overlay on response.

---

## Modified Components

| File | Change | Why |
|------|--------|-----|
| `app/api/solve/route.ts` | Add Redis `demo:{cid}` mark after successful solve | Authoritative usage tracking |
| `app/page.tsx` | Move to `app/corretor/page.tsx` (or route group) | Root `/` becomes landing |
| `app/layout.tsx` | Add `<meta>` for SEO; confirm font strategy | Marketing page needs metadata |
| `public/bookmarklet-source.js` | Keep as v1 reference; create v2 variant | v2 uses POST not clipboard |
| `app/bookmarklet/page.tsx` | Update instructions for v2 flow | New overlay UX |
| `lib/schemas.ts` | No change expected | Schema is stable |
| `lib/router.ts` | No change expected | Solve engine is stable |

---

## CORS Strategy

### The Problem
The bookmarklet v2 runs in the browser context of `ava.ead.unip.br`. It issues a `fetch("https://corretor.app/api/solve", { credentials: "include", ... })`. This is a cross-origin request with credentials.

Browser requirements for this to work:
1. Server responds with `Access-Control-Allow-Origin: https://ava.ead.unip.br` (exact, not `*`)
2. Server responds with `Access-Control-Allow-Credentials: true`
3. The `cid` cookie must have `SameSite=None; Secure` — only then will the browser send it cross-origin

### Implementation in `proxy.ts`

```typescript
const ALLOWED_ORIGINS = [
  "https://ava.ead.unip.br",
  "https://corretor.app",           // same-origin UI calls
]

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? ""
  const isAllowed = ALLOWED_ORIGINS.includes(origin)

  // Handle CORS preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowed ? origin : "",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    })
  }

  const response = NextResponse.next()

  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }

  return response
}

export const config = {
  matcher: ["/api/solve", "/api/checkout/:path*"],
}
```

### Cookie SameSite Requirement
The `cid` cookie must be set as `SameSite=None; Secure` — not `SameSite=Lax` (the browser default). `SameSite=Lax` blocks cross-origin cookies even with `credentials: "include"`. This is set when issuing the cookie in `proxy.ts`.

**Implication:** The cookie only works if corretor.app is served over HTTPS. Self-hosted VPS with Let's Encrypt satisfies this. Do not test bookmarklet CORS over HTTP.

### Preflight (OPTIONS)
The bookmarklet POST sends `Content-Type: application/json` which triggers a CORS preflight (OPTIONS). The `proxy.ts` matcher must handle OPTIONS for `/api/solve` and respond with 204 + CORS headers before the actual POST proceeds.

### AVA CSP Uncertainty
The existing bookmarklet page notes AVA may block inline scripts via CSP. Bookmarklet v2 making external fetch calls is a different threat model. If AVA's CSP includes `connect-src 'self'` without `https://corretor.app`, the fetch will be blocked. This cannot be fixed server-side — it is a client CSP constraint. Validate against live AVA CSP headers before committing to bookmarklet v2 as the primary input path.

---

## Deploy Flow

### VPS Stack
```
nginx (TLS termination, reverse proxy)
  └── Next.js standalone server (port 3000, node server.js)
       ├── lib/db.ts → PostgreSQL (port 5432, same host or localhost)
       └── lib/redis.ts → Redis (port 6379, same host or localhost)
```

### Build & Deploy Steps

**1. PostgreSQL setup (one-time):**
```bash
psql -U postgres -c "CREATE DATABASE corretor;"
psql -U postgres -d corretor -f lib/schema.sql
```

**2. Environment variables (`.env.production` on VPS, never committed):**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/corretor
REDIS_URL=redis://localhost:6379
GOOGLE_GENERATIVE_AI_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_BASE_URL=https://corretor.app
```

**3. Build (on VPS or CI):**
```bash
npm install
npm run build
# output: .next/standalone/
```

**4. Standalone output configuration (next.config.ts):**
```typescript
// next.config.ts
const nextConfig = {
  output: "standalone",
  async headers() {
    return [{
      source: "/:path*{/}?",
      headers: [{ key: "X-Accel-Buffering", value: "no" }],  // required for ndjson streaming through nginx
    }]
  },
}
export default nextConfig
```

**5. nginx config (streaming-critical):**
```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_buffering off;          # critical for ndjson streaming
  proxy_read_timeout 310s;      # solve route maxDuration=300
  proxy_send_timeout 310s;
  client_max_body_size 10m;     # base64 images in request body
}
```

**6. Process management (PM2):**
```bash
# Copy standalone output
cp -r .next/standalone ./deploy
cp -r .next/static ./deploy/.next/static
cp -r public ./deploy/public

# Start / restart
pm2 start deploy/server.js --name corretor --env production
pm2 save
```

**7. Stripe webhook registration:**
Register `https://corretor.app/api/webhooks/stripe` in Stripe Dashboard with events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## Suggested Build Order

Dependencies flow upward — later items depend on earlier ones. Never build gating before the data layer exists.

### Phase A: Data Layer
**Files:** `lib/schema.sql`, `lib/db.ts`, `lib/redis.ts`, environment variable wiring

Why first: Everything else depends on being able to talk to PostgreSQL and Redis. Validate connectivity before writing any business logic on top.

### Phase B: CORS + Cookie Proxy (proxy.ts, cookie issuance only)
**Files:** `proxy.ts` (cookie issuance + CORS headers, no gating logic yet)

Why second: Cookie must be issued before gating can read it. CORS must work before the bookmarklet can POST. Ship and validate the cookie + CORS flow with a manual fetch from AVA console before wiring the gate.

### Phase C: Stripe Integration
**Files:** `app/api/checkout/create/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/assinar/page.tsx`

Why third: Webhook handler updates PostgreSQL subscriptions. This must exist before the gate can query subscription status. Test webhook with Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`).

### Phase D: Demo Gate in proxy.ts
**Files:** `proxy.ts` (add Redis + PG gate logic), `app/api/solve/route.ts` (mark demo used)

Why fourth: Gate depends on subscriptions table existing and cookie existing. Activating the gate before Stripe is wired = locking out all users permanently.

### Phase E: Marketing Pages
**Files:** `app/page.tsx` → `app/corretor/page.tsx`, `app/(marketing)/page.tsx`, `app/instalar/page.tsx`, `app/painel/page.tsx`

Why fifth: No functional dependencies on earlier phases (except cookie for painel). Can be parallelized with Phase C after Phase B is done.

### Phase F: Bookmarklet v2
**Files:** `public/bookmarklet-v2-source.js`, updated `app/bookmarklet/page.tsx`

Why last: Depends on CORS (Phase B), gate (Phase D), and overlay UX design. Also dependent on verifying AVA CSP allows `connect-src corretor.app` — this validation gates the go/no-go decision for v2 vs keeping clipboard flow as fallback.

**Dependency graph:**
```
A (DB + Redis)
  └── B (proxy.ts + CORS)
      ├── C (Stripe + webhook)
      │   └── D (gate logic)
      │       └── F (bookmarklet v2)
      └── E (marketing pages)  ← parallel with C after B
```

---

## Integration Points Summary

### Files that change vs. files that are new

| File | Status | Integration Point |
|------|--------|------------------|
| `proxy.ts` | NEW | Reads `cid` cookie; queries Redis + PG; sets CORS headers |
| `lib/db.ts` | NEW | Singleton pg Pool; imported by proxy.ts, route handlers, webhook |
| `lib/redis.ts` | NEW | Singleton ioredis; imported by proxy.ts, api/solve |
| `lib/schema.sql` | NEW | Applied to PostgreSQL once during deploy |
| `app/api/webhooks/stripe/route.ts` | NEW | Writes subscriptions + payment_events tables |
| `app/api/checkout/create/route.ts` | NEW | Creates Stripe Checkout Session with `cid` in metadata |
| `app/assinar/page.tsx` | NEW | Paywall UI; triggers checkout create |
| `app/instalar/page.tsx` | NEW | Onboarding; static |
| `app/painel/page.tsx` | NEW | Dashboard; client-side localStorage only |
| `app/(marketing)/page.tsx` | NEW | Landing; replaces current root page |
| `public/bookmarklet-v2-source.js` | NEW | POSTs to /api/solve with credentials |
| `app/api/solve/route.ts` | MODIFIED | Add Redis demo-mark after successful stream close |
| `app/page.tsx` | MODIFIED | Moves to `app/corretor/page.tsx` (route restructure) |
| `app/bookmarklet/page.tsx` | MODIFIED | Update instructions for v2 overlay flow |
| `app/layout.tsx` | MODIFIED | SEO metadata for marketing pages |
| `next.config.ts` | NEW (create) | `output: "standalone"`, streaming headers |
| `lib/parser.ts` | UNCHANGED | Parser reused in bookmarklet v2 IIFE |
| `lib/router.ts` | UNCHANGED | Solve engine untouched |
| `lib/schemas.ts` | UNCHANGED | Zod schemas stable |

---

## Sources

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16) — proxy.ts, Node.js runtime, standalone build
- [Next.js Self-Hosting Guide](https://nextjs.org/docs/app/guides/self-hosting) — standalone output, nginx streaming config, env vars
- [Next.js proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — CORS example, cookie API, matcher config
- [Stripe PIX Documentation](https://docs.stripe.com/payments/pix) — PIX support for Checkout Sessions, one-time payments, Brazil BRL
- [Stripe Webhook Signature](https://docs.stripe.com/webhooks/signature) — raw body requirement (`request.text()`)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) — SameSite=None, credentials, preflight
- [ioredis GitHub Discussion #91716](https://github.com/vercel/next.js/discussions/91716) — ioredis confirmed compatible with Next.js 16 proxy.ts Node.js runtime
