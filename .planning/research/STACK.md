# Technology Stack — Corretor UNIP v2.0 SaaS Additions

**Project:** Corretor UNIP v2.0
**Researched:** 2026-05-13
**Scope:** SaaS infrastructure additions only. Existing stack (Next.js 16 / Vercel AI SDK / Gemini / shadcn/ui / Tailwind v4) is NOT re-litigated here.

---

## 1. Payments — Stripe (primary) + PIX via Stripe Checkout

### Decision: Use Stripe for everything. Do NOT add a native Brazilian gateway.

Stripe natively supports PIX since its EBANX partnership (announced 2025). PIX is available in Stripe Checkout, Payment Links, Elements, and Subscriptions (via Pix Automático). This means one SDK, one webhook surface, one dashboard, and one reconciliation flow instead of maintaining two separate payment providers.

**PIX via a native provider (Pagar.me, Asaas, Mercado Pago) is rejected** because:
- Adds a second SDK and second webhook handler to maintain
- Requires a separate dashboard for reconciliation
- Pagar.me and Asaas have no official Node.js SDK — REST-only integration adds boilerplate
- Mercado Pago's SDK DX is widely reported as poor compared to Stripe
- Stripe already handles the international settlement complexity via EBANX

**PIX recurring (Pix Automático) caveat:** As of May 2026, Stripe docs list Pix recurring as supported but the BRL subscription mandate requires the customer to authorize via their bank app. The feature is production-available but requires BRL-denominated subscriptions. If the Stripe account is not Brazil-registered, settlement is in USD/EUR with 3.5% IOF tax on the BRL-to-foreign-currency conversion — the customer pays BRL, Stripe absorbs the FX. This is acceptable for a bootstrapped SaaS; revisit only if MRR exceeds ~R$50k/month where native acquiring matters.

### Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | `^17.x` (latest stable as of research: 17.x line; npm shows 17.x for Node ESM) | Server-side SDK — API calls, webhook signature verification |
| `@stripe/stripe-js` | `^9.4.0` | Client-side — loads Stripe.js for Checkout redirect or Elements |
| `@stripe/react-stripe-js` | `^6.3.0` | React wrapper for Elements (only needed if using embedded Checkout; skip if using Stripe-hosted Checkout redirect) |

**Recommendation:** Use **Stripe-hosted Checkout** (redirect flow), not embedded Elements. Reason: PIX QR code display and Pix Automático mandate flow are handled by Stripe's hosted page with zero frontend work. For a subscription SaaS at this stage, the conversion rate difference vs. embedded checkout is negligible.

```bash
# Install
npm install stripe @stripe/stripe-js
# @stripe/react-stripe-js only if going embedded — skip for now
```

### Webhook setup for App Router

Route Handler at `app/api/webhooks/stripe/route.ts`. Disable Next.js body parsing for this route by reading `request.body` as `ReadableStream` and using `stripe.webhooks.constructEventAsync()`. Body must not be parsed before signature verification.

```ts
// next.config.ts — no special config needed for App Router route handlers
// The route handler must call:
const body = await request.text()
const event = await stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
```

---

## 2. Anonymous Freemium Gating — iron-session (cookie) + Redis counter

### Decision: iron-session for anonymous session cookie; Redis for the usage counter.

Do NOT add a full auth library (NextAuth, Clerk, Auth.js) for anonymous gating. The requirement is: track "1 free test" per browser session without a signup. This is a stateful cookie + server-side counter, not authentication.

**iron-session** creates an encrypted, tamper-proof cookie server-side. The cookie holds an opaque session ID (UUID). Redis holds `session:<id>:tests_used = N`. The server increments on each test submission and blocks at the gate (N >= 1 → require subscription check).

**Why not a plain signed JWT?** JWTs are not encrypted by default — the payload (session ID, usage count) is visible. iron-session uses AES-GCM encryption, so the cookie cannot be decoded by the client. Simpler and more secure for this use case than implementing JWE manually with jose.

**Why not store count in the cookie itself?** Clients can clear cookies and get a new session. The counter lives in Redis server-side, keyed to the session ID, with a 30-day TTL. Clearing the cookie gives a new session ID, but the Redis key for the old session orphans naturally. This is an acceptable tradeoff for anonymous gating — it is not air-tight fraud prevention, just a friction gate.

| Package | Version | Purpose |
|---------|---------|---------|
| `iron-session` | `^8.0.4` | Encrypted cookie session for anonymous users |

```bash
npm install iron-session
```

---

## 3. Redis — ioredis (self-hosted)

### Decision: ioredis, not @upstash/redis.

@upstash/redis uses HTTP transport — it exists to work in Vercel Edge / Cloudflare Workers where persistent TCP connections are unavailable. On a self-hosted VPS with a local Redis instance, HTTP adds unnecessary latency per request. ioredis uses a persistent TCP connection, supports automatic reconnection, pipelining, Lua scripting, and integrates with BullMQ if job queues are needed later.

**@upstash/redis is rejected** because: the project is on a self-hosted VPS, not serverless. HTTP overhead adds 5-20ms per call unnecessarily.

| Package | Version | Purpose |
|---------|---------|---------|
| `ioredis` | `^5.4.1` (latest stable 5.x line) | Redis client for rate limiting, session counters, optional cache |

```bash
npm install ioredis
npm install -D @types/ioredis  # types are bundled in v5, skip if using ioredis@5
```

Note: ioredis v5 ships its own TypeScript declarations — no `@types/ioredis` needed.

### Redis usage map

| Key pattern | TTL | Purpose |
|------------|-----|---------|
| `session:<uuid>:tests_used` | 30 days | Anonymous freemium counter |
| `rate:<ip>:solve` | 1 minute | Per-IP rate limit on solve endpoint |
| `rate:<session>:solve` | 1 minute | Per-session rate limit fallback |

Install Redis on VPS: `apt install redis-server` — no managed Redis needed at this scale.

---

## 4. PostgreSQL ORM — Drizzle ORM

### Decision: Drizzle ORM, not Prisma.

| Criterion | Drizzle | Prisma |
|-----------|---------|--------|
| Bundle size | ~7.4 KB gzip | ~1.6 MB (Prisma 7 improved but still large) |
| Migration | drizzle-kit push / generate | prisma migrate |
| Schema language | TypeScript (code-first) | Prisma SDL (separate file) |
| Edge runtime | Native | Requires Prisma Accelerate (paid) |
| SQL control | Full (Drizzle is SQL-typed, not SQL-abstracted) | Abstracted, less raw SQL |
| Learning curve | Moderate (needs SQL understanding) | Lower (opinionated abstraction) |

**Why Drizzle wins here:**
1. The project already uses TypeScript everywhere — schema-in-TypeScript keeps everything in one language with no DSL to learn
2. Smaller bundle matters for streaming Server Components (App Router)
3. Self-hosted VPS with direct TCP to PostgreSQL — no edge runtime constraint, but Drizzle's simpler connection model fits better
4. drizzle-kit migrations are plain SQL files — easy to inspect, version, and run manually if needed
5. Prisma's abstraction overhead is not worth it for a schema with 3-4 tables (subscriptions, payment_events, users, sessions)

**Prisma rejected** because: large bundle, DSL complexity, and Accelerate dependency for edge are all unjustified for this project size.

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | `^0.45.2` (stable; avoid 1.0 beta) | Runtime query builder |
| `postgres` | `^3.4.x` | PostgreSQL driver (postgres.js — recommended by Drizzle for Node.js servers) |
| `drizzle-kit` | `^0.30.x` | Dev CLI — migrations, schema push, Drizzle Studio |

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

**Do NOT use `pg` (node-postgres).** postgres.js (`postgres` package) is the Drizzle-recommended driver for traditional Node.js servers. It has cleaner async/await API, better performance, and no callback legacy.

### Minimal schema (3 tables)

```ts
// db/schema.ts
import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core'

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  status: text('status').notNull(), // 'active' | 'canceled' | 'past_due'
  planId: text('plan_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  type: text('type').notNull(),
  payload: text('payload').notNull(), // JSON string
  processedAt: timestamp('processed_at').defaultNow(),
})
```

---

## 5. VPS Deployment — Next.js Standalone + PM2 + Nginx

### Decision: next build with `output: 'standalone'` + PM2 v7 + Nginx reverse proxy.

No Docker required at this scale. Docker adds complexity (image builds, registry, container networking) that is not justified for a single-VPS single-app deployment.

### next.config.ts additions

```ts
const nextConfig = {
  output: 'standalone',       // produces .next/standalone — no node_modules needed on server
  // existing config below
}
```

### PM2 ecosystem config

```js
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'corretor-unip',
    script: '.next/standalone/server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 1,           // single instance; scale to 'max' if CPU-bound
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
  }]
}
```

### Nginx config (key directives)

```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header X-Real-IP $remote_addr;
  proxy_buffering off;          # Required for Next.js streaming / RSC
  proxy_read_timeout 300s;      # Allow for long AI generate requests
}
```

`proxy_buffering off` is mandatory — Next.js App Router streaming (RSC, Suspense) breaks if Nginx buffers the response.

| Tool | Version | Purpose |
|------|---------|---------|
| PM2 | `^7.0.1` (global install) | Process management, zero-downtime reload |
| Nginx | system package | Reverse proxy, TLS termination, static asset serving |
| Node.js | `>=20 LTS` (22 LTS recommended) | Runtime |

```bash
# On VPS
npm install -g pm2@latest
pm2 startup systemd   # auto-start on reboot
```

### Deploy flow (CI/CD via GitHub Actions or manual)

```bash
# Build locally or on CI
npm run build

# Sync to VPS (rsync .next/standalone + public/ + .next/static/)
rsync -az .next/standalone/ user@vps:/app/
rsync -az public/ user@vps:/app/public/
rsync -az .next/static/ user@vps:/app/.next/static/

# Reload without downtime
pm2 reload ecosystem.config.cjs --update-env
```

---

## Complete install commands

```bash
# Payment
npm install stripe @stripe/stripe-js

# Anonymous session
npm install iron-session

# Redis
npm install ioredis

# PostgreSQL
npm install drizzle-orm postgres
npm install -D drizzle-kit

# (VPS only — global)
npm install -g pm2@latest
```

---

## Do NOT Add

| What | Why not |
|------|---------|
| NextAuth / Auth.js / Clerk | Overkill for anonymous gating. No user accounts needed in v2.0. Add only if email login becomes a requirement. |
| @upstash/redis | HTTP transport adds latency on self-hosted VPS. ioredis on local Redis is faster and simpler. |
| @vercel/postgres | Designed for Vercel managed database (Neon/websocket). Direct TCP connection via postgres.js is correct for self-hosted PostgreSQL. |
| Prisma | Bundle too large, DSL overhead unjustified for 3-table schema. |
| @stripe/react-stripe-js | Only needed for embedded Elements. Stripe-hosted Checkout redirect handles PIX QR natively — no React component needed. |
| Pagar.me / Asaas / Mercado Pago | Second payment gateway = second webhook, second dashboard, second reconciliation. Stripe + PIX via EBANX covers the requirement with one integration. |
| Docker (for single VPS) | Adds image build time, registry, and container networking complexity with no benefit for a single-app single-server deployment. Use Docker only when moving to multi-instance or Kubernetes. |
| BullMQ / job queues | Not needed in v2.0. Stripe webhook processing is synchronous enough at this scale. Revisit if webhook fan-out becomes complex. |
| zod (already in project) | Already a dependency — use existing zod for webhook payload validation. |

---

## Sources

- Stripe PIX docs: https://docs.stripe.com/payments/pix
- Stripe PIX subscriptions: https://docs.stripe.com/billing/subscriptions/pix
- Stripe PIX changelog (2025-04-30): https://docs.stripe.com/changelog/basil/2025-04-30/add_pix_to_payment_method_configuration
- Stripe PIX US sellers (2025-05-28): https://docs.stripe.com/changelog/basil/2025-05-28/adds-pix-capability-for-us-sellers
- Next.js self-hosting guide: https://nextjs.org/docs/app/guides/self-hosting
- Drizzle ORM PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql
- Drizzle vs Prisma (makerkit 2026): https://makerkit.dev/blog/tutorials/drizzle-vs-prisma
- ioredis GitHub: https://github.com/redis/ioredis
- iron-session GitHub: https://github.com/vvo/iron-session
- PM2 npm: https://www.npmjs.com/package/pm2
