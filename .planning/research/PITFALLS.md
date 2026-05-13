# Domain Pitfalls: Corretor UNIP v2.0 SaaS Additions

**Domain:** Brazilian SaaS — Stripe + PIX subscriptions, anonymous freemium gating, bookmarklet injection, Redis rate limiting, Next.js VPS deployment
**Researched:** 2026-05-13
**Stack context:** Next.js 16 App Router, self-hosted VPS (nginx + PM2), Redis (self-hosted), Stripe with Pix Automatico

---

## 1. Stripe + PIX Subscriptions (Brazil)

### CRITICAL — PIX Automático is not card billing. The mental model is completely different.

**Problem:** Treating PIX subscriptions like card subscriptions. With cards, you store a token and charge whenever billing renews. With PIX Automático, the customer authorizes a mandate in their banking app with a fixed amount ceiling and billing frequency. Stripe cannot charge more than the customer authorized, and the customer can revoke the mandate at any time from their bank app without notifying you.

**Why it happens:** Developers import card-subscription mental model into PIX integration. The Stripe dashboard UI looks the same but the underlying mechanism is mandate-gated.

**Specific failure modes:**

- **Price increase kills silent renewals.** If you charge R$9,90/month and later raise the price (or add IOF tax on top), payments silently fail for all mandates where R$9,90 was the exact authorized ceiling. Stripe returns `payment_intent.payment_failed`; the customer's banking app shows "amount exceeds mandate". Prevention: set mandate `amount` 20-30% above current price at enrollment (e.g., authorize R$15 for a R$9,90 plan). Set `amount_type: maximum`, not `fixed`.

- **Mandate creation requires a 3-day start delay.** The `start_date` field must be at least 3 days in the future. If you attempt same-day subscription activation with PIX (expecting card-like behavior), Stripe rejects the mandate or the first charge falls into a 3-day pre-debit notification window. Build your checkout flow to inform users: "Your subscription activates in 3 business days after you confirm in your bank app."

- **Payment remains in `processing` for up to 7 days.** Unlike cards (settled immediately), PIX recurring payments can take 3-7 days to settle. Do not gate access by `payment_intent.succeeded`. Gate by `invoice.paid` or `customer.subscription.updated` with `status: active`. Provisioning access the moment a customer clicks "Pay" (before webhook confirms) is fine for UX, but access revocation must be driven by webhook, not polling.

- **Mandate revocation is silent and uncontestable.** When a customer revokes their PIX mandate in their banking app, Stripe fires `mandate.updated`. If you do not listen to this event, your database will show `subscription: active` while Stripe can no longer charge the customer. Handle `mandate.updated` to set a `payment_attention_required` flag and prompt the user to re-authorize on next login.

**Prevention:**
```typescript
// Mandate setup — always set ceiling above current price
payment_method_options: {
  pix: {
    mandate_options: {
      amount: 1500,          // R$15,00 ceiling for R$9,90 plan
      amount_type: 'maximum', // NOT 'fixed'
      payment_schedule: 'monthly',
      amount_includes_iof: 'never', // customer absorbs IOF
    }
  }
}

// Webhook events to handle (minimum viable set)
'invoice.paid'              // provision access
'invoice.payment_failed'    // send dunning email
'mandate.updated'           // revocation — prompt re-auth
'customer.subscription.deleted' // cancel access
```

**Phase:** Payment integration phase. Must be validated end-to-end in Stripe test mode using Stripe's special test email patterns (e.g., `succeed_immediately@test.com`) before going live.

---

### MODERATE — PIX disputes are automatic and uncontestable.

**Problem:** Unlike card chargebacks, you cannot fight a PIX dispute. If a customer's bank accepts their fraud claim, Stripe removes funds automatically. You receive no opportunity to provide evidence.

**Why it happens:** PIX is a push payment; the bank (not the card network) adjudicates disputes. Stripe's role is limited to notifying you after the fact.

**Prevention:** Keep Stripe `ReceiptUrl` links sent to customers after each charge. Issue proactive refunds within 90 days for legitimate customer complaints (Stripe allows refunds up to 90 days after PIX payment). This prevents escalation to the bank's dispute process. Do not rely on winning disputes — they are not winnable.

**Phase:** Do not architect refund flows around expecting to win disputes. Implement customer-facing refund self-service instead.

---

### MODERATE — Stripe Brazil account requires CPF/CNPJ lock-in.

**Problem:** The CPF or CNPJ used to open the Stripe Brazil account cannot be changed after creation. If the developer registers as an individual (CPF) and the project later needs a company account (CNPJ), a new Stripe account must be created from scratch, losing all customer and payment history.

**Why it happens:** Brazilian Central Bank regulations tie PIX keys and payout bank accounts to specific tax IDs.

**Prevention:** Decide CPF vs. CNPJ before creating the Stripe account. For a personal project (R$9,90/mês), CPF is fine. If you ever plan to invoice corporate clients or deduct expenses, start with CNPJ.

**Phase:** Account setup, before any code is written.

---

## 2. Anonymous Freemium Gating (Cookie-Based Demo Token)

### CRITICAL — Cookies are bypassable by design. The gate must be enforced server-side.

**Problem:** Storing the "free uses remaining" counter in a cookie or localStorage, then trusting the client-sent value in the API. Any user can open DevTools, edit the cookie to `uses_remaining=99`, and bypass the paywall indefinitely.

**Why it happens:** Cookie-based gating is often built as a pure client-side check (show/hide UI) without a corresponding server-side enforcement. The API route trusts the counter value sent by the client.

**Prevention:** The Redis counter must live server-side, keyed by the anonymous token, not a number stored in the cookie. The cookie holds only an opaque token identifier (UUID). The API route looks up the token in Redis, checks remaining count, decrements atomically.

```typescript
// WRONG: client sends remaining count
const remaining = parseInt(req.cookies.get('uses_remaining')?.value ?? '0');

// RIGHT: cookie is only an opaque identifier
const token = req.cookies.get('demo_token')?.value;
const remaining = await redis.get(`demo:${token}:remaining`);
if (!remaining || parseInt(remaining) <= 0) return 429;
await redis.decr(`demo:${token}:remaining`);
```

**Phase:** Anonymous gating phase. The gate enforcement and the Redis counter decrement must be in the API route, never in client-side code or middleware alone.

---

### CRITICAL — Incognito mode resets cookies; one user = unlimited free trials.

**Problem:** A user in incognito gets a fresh demo token on every session. If the gate allows 5 free solves per token and the token is stored only in a session cookie, the user gets 5 free solves per incognito window — unlimited total.

**Why it happens:** The demo token is created client-side or on first request with no persistence signal. Incognito clears cookies on close, so the next incognito window has no token and gets a fresh allocation.

**Consequences:** Free tier is completely meaningless as a conversion gate. Users never have a reason to pay.

**Prevention options (pick one based on acceptable abuse tolerance):**

1. **Persistent cookie with 30-day expiry (simplest, not incognito-proof):** Set `Max-Age=2592000` on the demo token cookie. Incognito users still bypass with a new window. Accept this and set the free tier low (3 solves, not unlimited).

2. **IP-based secondary counter (moderate, breaks shared NAT):** In Redis, also track `demo:ip:{hashedIP}:uses`. If IP has exhausted its allocation, reject even new tokens. Breaks university networks where many students share one IP.

3. **Accept incognito bypass as a known limitation.** UNIP students are a specific audience (not bots). Incognito bypass is a manual action requiring user intent. Set free tier to 1-2 solves (enough to demonstrate value, not enough to avoid paying). Do not over-engineer the gating.

**Recommended for this project:** Option 3. Set free tier to 2 solves. Incognito bypass is accepted. Students see the value in 2 solves and the friction of re-opening incognito for 2 more solves each time is real.

**Phase:** Gating phase. Decision must be made before implementation so Redis schema is correct from the start.

---

### MODERATE — Token sharing between students will happen.

**Problem:** Students will share premium account credentials or even anonymous demo tokens with each other. One paying user's token gets passed around a study group.

**Why it happens:** UNIP students coordinate heavily during exam review periods. Sharing a "here, use my Corretor token" is trivially easy via WhatsApp.

**Prevention:** Rate limit per token on the server (already needed for LLM quota reasons). A shared token will hit the per-token RPM/RPD limit faster, degrading experience for all users of that token. This is natural abuse deterrence without needing to detect sharing explicitly.

Do not try to enforce "one device per account" for a R$9,90 service — the engineering cost exceeds the revenue protection value.

**Phase:** Rate limiting phase. Tie token rate limits to LLM quota limits (40-50 API calls/day per token on self-managed quota).

---

## 3. Bookmarklet DOM Overlay Injection into UNIP AVA

### CRITICAL — The bookmarklet executes but injected external resources are still CSP-gated.

**Problem:** The bookmarklet itself (a `javascript:` URI) executes in most browsers even when the page has a restrictive CSP. However, any resource the bookmarklet tries to load externally (a CDN script tag, an external CSS file, a fetch to `corretor.yourdomain.com`) is still subject to the page's CSP. This catches developers who attempt to inject a script tag pointing to their own server from inside the bookmarklet.

**Why it happens:** Chrome executes bookmarklets as non-privileged page scripts (subject to CSP), while Firefox's behavior varies by version. The bookmarklet's own inline code runs, but `document.createElement('script'); script.src = 'https://corretor.domain.com/inject.js'` will be blocked by UNIP's `script-src 'self'` directive.

**Consequence for this project:** The bookmarklet must be entirely self-contained. No external script loading, no external fetch to Corretor's API (the bookmarklet only reads UNIP's DOM and writes to clipboard — this architecture is already correct per the Phase 7 research). If v2 adds a "send directly to API" mode inside the bookmarklet, that cross-origin fetch will be blocked by CORS unless Corretor's API sets explicit `Access-Control-Allow-Origin` headers.

**Prevention:** Keep the bookmarklet as a self-contained IIFE with zero external dependencies. If cross-origin API calls are added in a future milestone, they must be accompanied by explicit CORS headers on `/api/solve` and verification that UNIP's CSP does not block `connect-src` to the Corretor domain.

**Phase:** Any future bookmarklet v3 that adds direct API communication. Current Phase 7 architecture (clipboard only) is not affected.

---

### MODERATE — UNIP AVA may enforce a CSP that blocks bookmarklet execution entirely.

**Problem:** If `ava.ead.unip.br` (Blackboard LMS) sends `Content-Security-Policy: script-src 'self'` and the browser is a current Chrome or Firefox, the bookmarklet may be silently rejected before it executes at all.

**Why it happens:** CSP 1.1 changed the language from "should not" block bookmarklets to "may" allow user agents to enforce CSP on bookmarklets. Chrome and Firefox have inconsistently enforced this across versions. As of 2024-2025, Chrome enforces CSP against bookmarklets in some configurations.

**Detection:** If nothing happens when the bookmarklet is clicked, check the browser console for: `Refused to execute inline script because it violates the following Content Security Policy directive`.

**Prevention:** This cannot be fixed in the bookmarklet. The instructions page at `/bookmarklet` must include a prominent warning: "If nothing happens when you click the bookmarklet, your browser's security settings may be blocking it. Try Firefox if you're using Chrome, or contact us." Document the browser extension (MV3 content script) as the fallback for users who hit CSP blocks.

**Phase:** Phase 7 (already shipped). Add the warning to the instructions page if not already present. The fallback extension path should be documented but not built unless usage data shows CSP blocking is widespread.

---

### MODERATE — `String.fromCharCode(...new Uint8Array(buf))` stack overflow on large images.

**Problem:** The bookmarklet's base64 encoding using `btoa(String.fromCharCode(...new Uint8Array(largeBuffer)))` spreads all bytes as individual function arguments. For images larger than ~65KB, this hits the JS call-stack argument limit and throws `RangeError: Maximum call stack size exceeded`, silently skipping the image.

**Why it happens:** The spread operator `...` converts the TypedArray to N individual arguments. Large images exceed the engine's argument count limit (V8: ~65,000 to 256,000 depending on version).

**Prevention:** Use a chunked loop — this is already documented in the Phase 7 research and the recommended bookmarklet source uses it. Confirm the final committed bookmarklet uses the loop pattern, not the spread pattern:

```javascript
// WRONG (spread, stack overflow risk)
const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

// RIGHT (chunked loop, safe for any size)
let bin = '';
const bytes = new Uint8Array(buf);
for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
const b64 = btoa(bin);
```

**Phase:** Phase 7 (already shipped). Verify the committed bookmarklet source uses the loop pattern. If it uses spread, fix before v2.0 launch.

---

### MINOR — Safari loses clipboard write permission after async image fetches.

**Problem:** `navigator.clipboard.writeText()` requires an active user gesture. The bookmarklet runs as a result of clicking the bookmark (a user gesture), but by the time all `await fetch()` image downloads complete, Safari considers the gesture stale and throws `NotAllowedError`.

**Why it happens:** Safari has a shorter user-gesture activation window than Chrome/Firefox. Multiple awaited async operations exhaust the activation token before the clipboard write.

**Prevention:** The `document.execCommand('copy')` fallback in the bookmarklet's catch block handles this. Ensure the fallback is tested on Safari. The fallback does not require an active gesture and is synchronous.

**Phase:** Phase 7. Test on Safari Mobile (iPhone) before v2.0 since UNIP students are mobile-heavy.

---

## 4. Rate Limiting a Streaming API Endpoint with Redis

### CRITICAL — Rate limit check must happen before the streaming Response is returned, not inside it.

**Problem:** In Next.js App Router, once you return a `new Response(stream)`, headers are locked. You cannot send a `429 Too Many Requests` response after the stream has started. If the rate limit check happens inside the stream processing loop, you can detect the limit was exceeded but you cannot signal it to the client via HTTP status code — the client already received a `200 OK`.

**Why it happens:** Streaming responses flush headers immediately upon returning the `Response` object. Any logic that runs after `return new Response(readableStream)` cannot modify the status code or headers.

**Prevention:** Check Redis rate limit counter atomically before creating the stream. Return `429` immediately if exceeded, then return the streaming `Response` only if allowed.

```typescript
// app/api/solve/route.ts
export async function POST(req: Request) {
  const token = getToken(req); // from cookie or header

  // Check rate limit FIRST, before any stream is created
  const { allowed, remaining } = await checkRateLimit(token);
  if (!allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
    });
  }

  // Only create the stream if allowed
  const stream = createSolveStream(req);
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(remaining),
    },
  });
}
```

**Phase:** Rate limiting phase. This constraint shapes the entire middleware architecture.

---

### CRITICAL — `INCR` + `EXPIRE` as separate Redis commands has a race condition.

**Problem:** The naive pattern `await redis.incr(key); await redis.expire(key, 60)` has a race: if the process crashes or the connection drops between `INCR` and `EXPIRE`, the key persists forever with no TTL. The counter never resets, and the user is permanently rate-limited.

**Why it happens:** Two separate Redis commands are not atomic. Any failure between them leaves an inconsistent state.

**Prevention:** Use a Lua script (via Redis `EVAL`) that atomically increments and sets TTL in a single command, or use `SET key value EX ttl NX` for initial creation combined with `INCR`. The `@upstash/ratelimit` library handles this correctly internally. If self-hosting Redis without that library, use:

```lua
-- Atomic increment + TTL in Lua (run via redis.eval)
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
```

Or use `ioredis` with a pipeline that fails atomically, combined with `SET ... NX EX` for initialization.

**Phase:** Rate limiting phase. The self-hosted Redis is already planned (per the todos/done planning doc). Use sliding window or fixed window with atomic Lua scripts.

---

### MODERATE — IP-based rate limiting breaks university networks.

**Problem:** UNIP students access the platform from university networks that NAT many users behind a single IP. Limiting by IP blocks all students on that network when any one of them hits the limit.

**Why it happens:** University campus Wi-Fi and VPN concentrators share outbound IPs. Brazilian universities commonly NAT entire buildings through one or a few IPs.

**Prevention for this project:** Rate limit by anonymous demo token (opaque UUID in cookie), not by IP. IP can be a secondary signal for abuse detection (flag for manual review if one IP generates >50 unique tokens/day) but should not be the primary gate. Paying users are identified by their subscription status in the database, not by IP.

**Phase:** Rate limiting phase. Design the Redis key schema around token identity from day one.

---

## 5. Next.js Standalone Deployment to VPS (nginx + PM2)

### CRITICAL — Standalone output does not include `public/` or `.next/static/`. They 404 silently.

**Problem:** Running `next build` with `output: 'standalone'` creates a self-contained `.next/standalone/` directory. This directory does NOT include the `public/` folder or `.next/static/` assets. Deploying only the standalone directory causes all static assets (fonts, icons, static images, the bookmarklet source file) to return 404.

**Why it happens:** Next.js assumes a CDN serves static assets in production. The standalone output is designed to be minimal — just the Node.js server. Static assets must be manually copied or served separately.

**Prevention:** Copy step is required in every deployment script:

```bash
# After build, before starting server
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Then start the standalone server
node .next/standalone/server.js
```

Add this to the PM2 deploy script or CI/CD pipeline. If using PM2 ecosystem config, add a `post_deploy` hook that runs the copy step.

**Phase:** Deployment phase. Verify on first VPS deployment with a checklist item: "static assets load correctly (check /bookmarklet page, favicon, fonts)."

---

### CRITICAL — nginx buffers streaming responses by default, breaking ndjson streaming.

**Problem:** nginx's `proxy_buffering` is `on` by default. For the streaming `/api/solve` endpoint (which uses ndjson to progressively send solved questions), nginx buffers the entire response body before forwarding it to the client. The client sees nothing until the LLM finishes all questions, negating the streaming UX entirely.

**Why it happens:** nginx's default configuration is optimized for static file serving, not streaming. Proxy buffering accumulates the upstream response before forwarding.

**Prevention:** Two approaches (use both):

**Option A — nginx server block config (preferred for the solve endpoint):**
```nginx
location /api/solve {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Connection '';
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 120s;
}
```

**Option B — Next.js response header (fallback, works automatically):**
```typescript
// next.config.js
async headers() {
  return [{
    source: '/api/solve',
    headers: [{ key: 'X-Accel-Buffering', value: 'no' }],
  }];
}
```

`X-Accel-Buffering: no` is an nginx-specific header that disables buffering for that response at the nginx layer, even without changing nginx config. Use both approaches for defense in depth.

**Phase:** Deployment phase. This is the single most common "streaming was working in dev but not in production" problem with nginx.

---

### CRITICAL — Client-side env vars baked at build time, not runtime.

**Problem:** `NEXT_PUBLIC_*` variables are inlined into the JavaScript bundle at `next build` time. If you build on the VPS with one set of env vars and later change them, you must rebuild — `pm2 restart` alone does not pick up the new values. Worse, if a `NEXT_PUBLIC_*` var was not set during build, it silently becomes `undefined` in the browser bundle with no error.

**Why it happens:** Next.js inlines public env vars as string constants during bundling. There is no runtime substitution for `NEXT_PUBLIC_*` variables.

**Prevention:** Server-side env vars (`STRIPE_SECRET_KEY`, `REDIS_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`) are read at runtime from `process.env` — they can be changed in PM2's ecosystem file without a rebuild. But `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (used client-side for Stripe.js) must be present at build time. Use a `.env.production` file checked into the server (not the repo) and confirm all `NEXT_PUBLIC_*` vars are set before running `next build`.

**Also:** There is a regression in Next.js 15.3 (bug #80194) where env vars are not available in client components in standalone mode. Check the installed version. If hitting this, pin to 15.2.x or apply the workaround from the issue tracker.

**Phase:** Deployment phase. Add a startup check in `instrumentation.ts` that throws loudly if required server-side env vars are missing.

---

### MODERATE — `sharp` binary built for the wrong OS.

**Problem:** If `sharp` (used by `next/image` for image optimization) is installed on macOS (developer machine) and the build output is copied to a Linux VPS, `sharp` fails at runtime because the native binary is platform-specific.

**Why it happens:** `sharp` uses libvips, a native library compiled for the target OS architecture. macOS and Linux binaries are incompatible.

**Prevention:** Either install dependencies on the VPS directly (not copy `node_modules` from dev machine), or add `sharp` as a production dependency and run `npm install --os=linux --cpu=x64 sharp` to force the Linux binary. For the standalone output, `sharp` must be included in `.next/standalone/node_modules/`.

Alternatively, disable `next/image` optimization entirely if not using `<Image>` components (the app is a tool, not an image-heavy site):

```typescript
// next.config.js
images: { unoptimized: true }
```

**Phase:** Deployment phase. Decide at deployment time whether `next/image` optimization is needed. Given the tool's nature (no image display in Corretor's own UI), `unoptimized: true` is likely the right call.

---

### MINOR — NODE_ENV is always `production` in standalone mode. Cannot use it as an app-env flag.

**Problem:** `process.env.NODE_ENV` is hardcoded to `'production'` by Next.js during `next build` and `next start`. You cannot use it to distinguish staging from production environments.

**Prevention:** Use a separate `APP_ENV=staging` or `DEPLOY_ENV=production` env var for environment-specific behavior. Never branch on `NODE_ENV` for app logic — only for framework-level behavior (dev warnings, etc.).

**Phase:** Deployment phase. Establish the env var naming convention before wiring Stripe keys (you need different Stripe keys for test vs. live mode).

---

## 6. Stripe Webhook Idempotency

### CRITICAL — Stripe delivers the same event more than once. Your handler must be idempotent.

**Problem:** Stripe retries webhook deliveries for up to 3 days on `5xx` responses or timeouts. A slow database write on the first attempt causes a timeout, Stripe retries, and your handler runs twice. If the handler provisions access and sends a welcome email, the user gets two emails and potentially two subscription records.

**Why it happens:** Stripe's retry policy is aggressive (exponential backoff for 3 days in production). Any handler that does not respond within 20 seconds gets retried. Complex database operations, sending emails, and calling external APIs inside the handler all risk exceeding the 20-second window.

**Prevention:**
1. **Return `200` immediately** after signature verification. Move all side effects to an async queue or background job.
2. **Persist processed event IDs** in a database table with a unique constraint on `stripe_event_id`. On duplicate: return `200` without processing.
3. **Make provisioning operations idempotent:** `INSERT ... ON CONFLICT DO NOTHING` for subscription records. `UPSERT` for user access flags.

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text(); // raw body for signature verification
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency check BEFORE any side effects
  const alreadyProcessed = await db.webhookEvents.findUnique({ where: { stripeEventId: event.id } });
  if (alreadyProcessed) return new Response('OK', { status: 200 });

  // Enqueue for async processing, do not block response
  await queue.enqueue({ eventId: event.id, type: event.type, data: event.data });

  // Record immediately (unique constraint prevents duplicate enqueue on concurrent delivery)
  await db.webhookEvents.create({ data: { stripeEventId: event.id, type: event.type } });

  return new Response('OK', { status: 200 });
}
```

**Phase:** Webhook integration phase.

---

### CRITICAL — Raw body must not be parsed before signature verification.

**Problem:** Next.js App Router's `request.json()` parses the body and discards the raw bytes. Stripe's `constructEvent()` requires the exact raw bytes that Stripe signed. If you call `req.json()` before `stripe.webhooks.constructEvent()`, the signature check always fails with `No signatures found matching the expected signature`.

**Why it happens:** JSON serialization can alter whitespace, key ordering, or encoding in edge cases. More practically, any body-parsing middleware that runs before your webhook route (Next.js body size limit enforcement, custom middleware that calls `req.json()`) consumes the stream, making it unavailable for raw body access.

**Prevention:** Always use `req.text()` (not `req.json()`) in the webhook route:

```typescript
const body = await req.text(); // NOT req.json()
const sig = req.headers.get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(body, sig, secret);
```

Ensure no middleware calls `req.json()` or `req.arrayBuffer()` on the request before the webhook route handler receives it. In Next.js App Router, each route handler receives a fresh `Request` — there is no global body-parsing middleware — so this is safe as long as you do not call `json()` yourself.

**Phase:** Webhook integration phase. This is the single most reported Stripe + Next.js integration failure.

---

### CRITICAL — Out-of-order event delivery breaks state machines.

**Problem:** Stripe does not guarantee event delivery order. `customer.subscription.updated` can arrive before `customer.subscription.created`. For PIX specifically, `invoice.paid` can arrive before `setup_intent.succeeded` (mandate authorization). If your handler assumes events arrive in creation order, a late-arriving `created` event can overwrite state set by an `updated` event, downgrading a subscription that should be active.

**Why it happens:** Stripe's delivery infrastructure is distributed. Network conditions, retry timing, and parallel delivery to multiple webhook endpoints can cause any ordering.

**Prevention:**
- Never use event arrival order to determine current state. Use the `data.object` within the event (the object's own state at event creation time is embedded).
- For subscription status: fetch current status from Stripe API on receipt of any status-changing event, rather than deriving state from event sequence.
- For database writes: use `updated_at` timestamps from Stripe's objects, not from your event processing order. Only update if the incoming event's `created` timestamp is newer than the current record.

```typescript
// Defensive: only update if event is newer than stored state
const currentSub = await db.subscriptions.findUnique({ where: { stripeSubId: sub.id } });
if (!currentSub || event.created > currentSub.lastEventTimestamp) {
  await db.subscriptions.upsert({
    where: { stripeSubId: sub.id },
    update: { status: sub.status, lastEventTimestamp: event.created },
    create: { stripeSubId: sub.id, status: sub.status, lastEventTimestamp: event.created },
  });
}
```

**Phase:** Webhook integration phase. Review every event handler for state-machine correctness under arbitrary ordering.

---

### MODERATE — Stripe signature tolerance window is 5 minutes. Server clock drift breaks verification.

**Problem:** `stripe.webhooks.constructEvent()` rejects signatures older than 5 minutes by default (replay attack protection). If the VPS system clock drifts more than 5 minutes from UTC, all webhook verifications fail with `Webhook timestamp is too old`.

**Why it happens:** VPS clocks drift without NTP synchronization. This is common on cloud VMs that were suspended/snapshotted and resumed.

**Prevention:** Ensure NTP is running on the VPS:
```bash
# Ubuntu/Debian
sudo timedatectl set-ntp true
timedatectl status  # verify NTP synchronized: yes
```

In production, monitor for this specifically: a sudden spike in `400` responses on the webhook endpoint after a VPS restart or migration is often clock drift, not a code bug.

**Phase:** Deployment phase. Add to VPS setup checklist: NTP enabled and synchronized.

---

### MODERATE — PIX-specific: `mandate.updated` is the subscription cancellation signal.

**Problem:** For PIX subscriptions, a customer cancelling their subscription does not always fire `customer.subscription.deleted` first. They may revoke the mandate in their banking app, which fires `mandate.updated` with `status: inactive`. If you only listen to subscription lifecycle events and ignore mandate events, you miss the cancellation and continue serving a customer whose next payment will fail.

**Why it happens:** PIX mandate lifecycle is separate from the Stripe subscription object lifecycle. The mandate object is the underlying authorization; the subscription is built on top of it. Mandate revocation precedes subscription termination in the event sequence.

**Prevention:** Subscribe to `mandate.updated` in addition to subscription events. When `mandate.updated` fires with `status: inactive`, mark the linked subscription as `payment_attention_required` and surface a "re-authorize your payment" prompt on next login.

**Phase:** Webhook integration phase. Add to the webhook event handler test matrix: "PIX mandate revoked by customer."

---

## Phase-Specific Warning Summary

| Phase Topic | Pitfall | Severity | Mitigation |
|-------------|---------|----------|------------|
| PIX subscription setup | Mandate amount ceiling too low for price increases | CRITICAL | Set mandate amount 20-30% above plan price |
| PIX subscription setup | 3-day activation delay surprises users | MODERATE | Communicate delay in checkout UI |
| PIX subscription setup | Mandate revocation is silent | CRITICAL | Handle `mandate.updated` webhook |
| Anonymous gating | Client-side counter trust | CRITICAL | Redis counter server-side only |
| Anonymous gating | Incognito bypass | MODERATE | Accept; set free tier to 2 solves |
| Bookmarklet injection | External resource CSP block | CRITICAL | Keep bookmarklet self-contained IIFE |
| Bookmarklet injection | CSP blocks bookmarklet execution | MODERATE | Document browser fallback on instructions page |
| Bookmarklet injection | `btoa` spread stack overflow | MODERATE | Verify chunked loop pattern in committed source |
| Rate limiting streaming | Rate limit check after stream return | CRITICAL | Check Redis before creating stream |
| Rate limiting streaming | `INCR` + `EXPIRE` race condition | CRITICAL | Use atomic Lua script |
| Rate limiting streaming | IP-based limiting breaks campus networks | MODERATE | Key by token, not IP |
| VPS deployment | Missing static assets (public/, .next/static/) | CRITICAL | Copy step in deploy script |
| VPS deployment | nginx buffering streaming endpoint | CRITICAL | `proxy_buffering off` + `X-Accel-Buffering: no` |
| VPS deployment | NEXT_PUBLIC_* not set at build time | CRITICAL | Verify all vars before `next build` |
| VPS deployment | `sharp` cross-platform binary | MODERATE | Build on Linux or use `unoptimized: true` |
| Webhook idempotency | Duplicate delivery processing | CRITICAL | Persist event IDs, idempotent upserts |
| Webhook idempotency | Raw body consumed before signature check | CRITICAL | Use `req.text()`, not `req.json()` |
| Webhook idempotency | Out-of-order event overwrites newer state | CRITICAL | Timestamp-guarded upserts |
| Webhook idempotency | Clock drift invalidates signatures | MODERATE | Ensure NTP on VPS |
| Webhook idempotency | PIX mandate revocation not in subscription events | MODERATE | Handle `mandate.updated` |

---

## Sources

- [Stripe: Pix Automatico](https://docs.stripe.com/payments/pix/pix-automatico) — mandate lifecycle, amount limits, timing
- [Stripe: Set up subscription with Pix](https://docs.stripe.com/billing/subscriptions/pix) — subscription-specific limitations
- [Stripe: Pix disputes](https://docs.stripe.com/payments/pix) — dispute rules, uncontestable nature
- [Stripe: Receive webhook events](https://docs.stripe.com/webhooks) — retry policy, duplicate delivery, idempotency
- [Stigg: Stripe webhook best practices](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — out-of-order events, signature 5-min window
- [Next.js: Self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) — standalone static assets, streaming, env vars
- [Next.js GitHub Issue #80194](https://github.com/vercel/next.js/issues/80194) — env var regression in standalone mode 15.3
- [Redis: Rate limiting algorithms](https://redis.io/learn/howtos/ratelimiting) — atomic Lua, INCR+EXPIRE race
- [DEV: Fixing race conditions in Redis counters](https://dev.to/silentwatcher_95/fixing-race-conditions-in-redis-counters-why-lua-scripting-is-the-key-to-atomicity-and-reliability-38a4) — Lua atomic scripts
- [Mozilla Bugzilla #866522](https://bugzilla.mozilla.org/show_bug.cgi?id=866522) — CSP + bookmarklet browser behavior
- [Chromium Issue #233903](https://bugs.chromium.org/p/chromium/issues/detail?id=233903) — Chrome CSP + bookmarklet
- [Phase 7 Research](.planning/phases/07-bookmarklet/07-RESEARCH.md) — btoa stack overflow, CSP analysis
- [Rate limiting todo](.planning/todos/done/2026-04-04-harden-api-route-with-model-validation-and-rate-limiting.md) — existing project decisions on self-hosted Redis
