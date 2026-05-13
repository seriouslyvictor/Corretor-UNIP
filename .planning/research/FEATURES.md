# Feature Landscape: Corretor UNIP v2.0 SaaS

**Domain:** AI-powered exam solver → freemium SaaS for Brazilian university students
**Researched:** 2026-05-13
**Milestone context:** Turning a private Next.js + Gemini tool into a public R$9,90/mês product

---

## Existing v1 Code (do NOT re-implement)

These are shipping. All new features must layer on top without breaking them.

| Built | Location |
|-------|----------|
| HTML parsing of UNIP test pages (client-side) | `lib/parser.ts` |
| `/api/solve` streaming route (Gemini, ndjson) | `app/api/solve/route.ts` |
| No BS / Verbose answer modes | `lib/prompts.ts` |
| Bookmarklet (inlines images, copies HTML) | `public/bookmarklet-source.js`, `app/bookmarklet/page.tsx` |
| Gabarito grid UI (progressive skeleton, retry) | `components/gabarito-grid.tsx` |

---

## Category 1: Access Control / Freemium Gating

### How anonymous demo gating actually works

**Cookie-first (recommended for this use case):** Issue a `uuid` into a first-party `HttpOnly` cookie on first visit via Next.js middleware. Store a counter (`solves_used`) against that token in a lightweight store (Redis via Upstash is the standard Next.js pattern). After 1 free solve, block `/api/solve` and redirect to the paywall. Cookie survives browser restarts but not private browsing. Implementation: Next.js middleware reads the cookie, checks Upstash, gates the route before it hits the handler.

**Why not fingerprint:** Browser fingerprinting (canvas, WebGL, audio fingerprint) achieves ~85-90% cross-session accuracy but is legally sensitive — the UK ICO called Google's 2025 fingerprinting policy "irresponsible," and it violates GDPR/PECR principles because fingerprints cannot be deleted by the user. For a student tool in Brazil (LGPD territory), fingerprinting is a legal risk the project does not need.

**Why not IP:** IP is 70-80% accurate in identification. Brazilian university campuses share IPs via NAT — one block could prevent an entire dorm floor from trying the free demo. Do not use IP as the primary gate key.

**Bypass surface:** Cookies can be cleared. The free demo is a loss leader for conversion, not a hard security boundary. Spending significant engineering effort to plug the bypass is an anti-feature — students who clear cookies are not the paying audience.

---

| Feature | Type | Complexity | v1 dependency |
|---------|------|------------|---------------|
| Anonymous visitor token (HttpOnly cookie, `crypto.randomUUID()`, set in Next.js middleware on first request) | Table stakes | Low | None — new middleware layer |
| Solve counter in Upstash Redis keyed to visitor token (increment on each `/api/solve` call) | Table stakes | Low–Med | Wraps existing `/api/solve` |
| Gate enforcement: return HTTP 402 from `/api/solve` when counter ≥ 1 and user is not subscribed | Table stakes | Low | Wraps existing `/api/solve` |
| Client-side paywall modal on 402 response (existing gabarito grid receives 402, shows upgrade CTA instead of results) | Table stakes | Low | Requires gabarito-grid to handle 402 state |
| Server-side subscription status check (look up Stripe customer by visitor token or email, verify active subscription) | Table stakes | Med | New — requires Stripe integration |
| Clear free-usage gate after successful payment (reset counter or mark token as subscribed in Redis) | Table stakes | Low | Depends on Stripe webhooks |
| "Change plans anytime" copy + guarantee text on paywall | Table stakes | Trivial | None |
| Usage milestone nudge ("You've solved 1 test — upgrade to solve unlimited") | Differentiator | Low | Reads counter from Redis |
| Fingerprint-based gating as supplement to cookie | Anti-feature | High | Legal risk, LGPD/GDPR exposure |
| IP-based gating | Anti-feature | Low | Blocks shared campus networks |

---

## Category 2: Payment (Stripe + PIX)

### PIX billing research findings (critical nuances)

**PIX is NOT natively recurring — historically.** PIX was designed as an instant one-time transfer. As of April 22 2026, Stripe added official support for PIX recurring payments via **PIX Automático** (Pix Automático). This is the Banco Central's mandate-based recurring infrastructure, rolled out in 2025.

**How PIX Automático works for subscriptions (Stripe):**
1. Customer goes to Stripe Checkout in subscription mode.
2. Customer scans a QR code in their banking app.
3. Inside the app, customer authorizes a mandate: amount cap (e.g., R$9,90/month), payment schedule (monthly).
4. Mandate created — Stripe auto-charges on billing cycle.
5. Customer's bank sends a 3-day pre-debit notification before each renewal.
6. Customer can revoke mandate in their bank app at any time (Stripe sends `mandate.updated` webhook).

**Key PIX subscription limitations for this project:**
- R$3,000 per-transaction maximum (irrelevant at R$9,90 but worth documenting).
- No daily billing schedule — monthly only is fine for this product.
- 3-day pre-debit notification + up to 7-day retry window means a subscription renewal can take up to 10 days to clear. Do not immediately lock access on invoice due date; grant a 7-day grace period.
- If mandate is revoked, the customer must re-authorize. Build a re-authorization flow (email prompt + Stripe Checkout link).
- PIX Automático appears to be available for Stripe Brazil accounts as of April 2026 but verify eligibility with Stripe support before building.

**CPF is required:** Stripe Checkout collects CPF (individual) or CNPJ (business) for PIX payments in Brazil. This is non-optional per Brazilian regulatory framework. Plan the Checkout UI accordingly — students will have CPF.

**Stripe fees in Brazil:** PIX costs 1.19% per transaction vs 3.99% + R$0,39 for card. At R$9,90 this means PIX costs ~R$0,12 vs card ~R$0,79. Offer both — some students will prefer card.

---

| Feature | Type | Complexity | v1 dependency |
|---------|------|------------|---------------|
| Stripe Checkout (hosted page, subscription mode) for R$9,90/mês — supports both card and PIX Automático | Table stakes | Med | None |
| PIX Automático mandate authorization during Checkout (customer authorizes in bank app) | Table stakes | Med | Depends on Stripe Checkout setup |
| CPF field in Checkout (mandatory for PIX; Stripe collects this automatically in Checkout hosted page) | Table stakes | Trivial | Stripe handles |
| Stripe webhook handler: `invoice.payment_succeeded` → grant access, `mandate.updated` → handle revocation, `customer.subscription.deleted` → revoke access | Table stakes | Med | New Next.js route `/api/webhooks/stripe` |
| 7-day grace period on failed renewal (do not lock immediately) | Table stakes | Low | Requires subscription status logic |
| Re-authorization flow for revoked mandates (email + Checkout link to re-subscribe) | Table stakes | Med | Stripe Customer Portal handles this |
| Stripe Customer Portal link (let subscribers manage/cancel their own subscription) | Table stakes | Low | Stripe-hosted; one redirect link |
| Card payment (as alternative to PIX) | Table stakes | Trivial | Stripe Checkout supports both natively |
| Success/cancel redirect pages after Checkout | Table stakes | Low | New pages: `/subscribe/success`, `/subscribe/cancel` |
| Store Stripe customer ID linked to visitor token/email (for subscription status lookups) | Table stakes | Low | Upstash or lightweight DB |
| One-time PIX payment flow (no mandate, QR expires in 4 hours default / configurable up to 14 days) | Anti-feature | Low | Stripe one-time PIX does not enable auto-renewal; student forgets to renew = lost revenue |
| Annual billing option at launch | Anti-feature | Low | Adds pricing page complexity; launch monthly only |
| Trial period (7-day free trial with PIX mandate) | Differentiator | Med | Stripe supports free trial + mandate creation simultaneously |

---

## Category 3: Bookmarklet Overlay UX

### How established tools inject panels into host pages

**Shadow DOM is the canonical pattern.** Grammarly, Notion Web Clipper, and browser extensions all use Shadow DOM to inject isolated UI panels. The Shadow DOM creates a scoped style boundary — the host page's CSS does not cascade in, and injected CSS does not pollute the host. For a bookmarklet on ava.ead.unip.br (UNIP's AVA portal, unknown CSS), this isolation is mandatory.

**Architecture for the v2 overlay:**
1. Bookmarklet IIFE runs on AVA page.
2. Creates a `div` appended to `document.body`.
3. Attaches a Shadow Root in "open" mode: `div.attachShadow({ mode: 'open' })`.
4. Injects a `<style>` tag inside the shadow root with all panel CSS (`all: initial` on `:host` to prevent inheritance leakage).
5. Injects the panel HTML structure into the shadow root.
6. Panel communicates with Corretor's `/api/solve` endpoint via `fetch` (cross-origin — requires CORS headers on the API).
7. Streams the ndjson response, renders answers inline in the panel.

**Desktop sidebar vs mobile bottom sheet:** Position the panel using `position: fixed` at the viewport edge. Use a `@media (max-width: 768px)` breakpoint inside the shadow root's style to shift from a right-side drawer to a bottom sheet. This is the standard pattern used by browser extension sidebars (e.g., Grammarly).

**CORS requirement:** Current `/api/solve` does not send CORS headers because all callers are same-origin (the Next.js app). The overlay calls from ava.ead.unip.br which is a different origin. Requires adding `Access-Control-Allow-Origin: https://ava.ead.unip.br` (or a configurable list) to the API response.

**Authentication from overlay:** The visitor token cookie is HttpOnly and cannot be read by JavaScript. The overlay cannot forward it directly. Options: (a) user pastes a session token from the Corretor web app into the overlay (friction), (b) overlay redirects to Corretor for a token exchange, (c) bookmarklet reads a non-HttpOnly cookie or localStorage flag set by Corretor. Option (c) is simplest: store a non-sensitive "is_subscribed" flag in localStorage on the Corretor domain, and rely on server-side rate limiting keyed to IP as a fallback guard for the overlay (overlay users who cheated the cookie gate on the main site still hit Upstash rate limiting).

---

| Feature | Type | Complexity | v1 dependency |
|---------|------|------------|---------------|
| Shadow DOM panel injection (bookmarklet creates isolated div + shadow root on AVA page) | Table stakes | Med | Extends existing `public/bookmarklet-source.js` |
| Panel CSS isolation (`all: initial` on `:host`, scoped styles in shadow root) | Table stakes | Low | Part of shadow DOM setup |
| Desktop sidebar layout (right-side fixed drawer, ~360px wide) | Table stakes | Med | New CSS inside shadow root |
| Mobile bottom sheet layout (`@media` breakpoint inside shadow root, slides up from bottom) | Table stakes | Med | Extends desktop sidebar CSS |
| Solve trigger button inside overlay (reuses parsed HTML already on the page) | Table stakes | Med | Calls existing `/api/solve` from a different origin |
| ndjson streaming rendering inside panel (display answers progressively as they stream) | Table stakes | Med | Adapts existing streaming client logic from `app/page.tsx` |
| CORS headers on `/api/solve` for `ava.ead.unip.br` origin | Table stakes | Low | Modifies existing API route |
| Overlay close/minimize button (collapses to a tab/toggle at the edge) | Table stakes | Low | Pure CSS/JS |
| Answer display in overlay: confidence-colored letters matching gabarito grid style | Table stakes | Med | Port of `components/gabarito-grid.tsx` logic, rewritten as vanilla JS |
| Paywall state in overlay: "You've used your free solve — subscribe to continue" with link to Corretor | Table stakes | Low | Reads 402 response from `/api/solve` |
| Drag handle to resize sidebar width | Differentiator | Med | Pointer event listeners, local state |
| Verbose mode toggle inside overlay | Differentiator | Low | Passes `mode` param to existing API |
| Persist user's mode preference in overlay (localStorage) | Differentiator | Low | `localStorage.setItem` inside overlay |
| iFrame-based overlay instead of Shadow DOM | Anti-feature | High | iframe requires sandboxing, postMessage, complicates auth — Shadow DOM is simpler and sufficient |
| Injecting React/Next.js bundle into the overlay | Anti-feature | High | Adds ~200KB to bookmarklet load; AVA may block external scripts via CSP; use vanilla JS |

---

## Category 4: Marketing / Landing / Onboarding

### What table-stakes marketing pages look like for a tool like this

The standard pattern for bookmarklet-based tools (e.g., Readwise Reader's bookmarklet, Pocket's old bookmarklet, accessibility checkers): a single landing page with (1) the value proposition above the fold, (2) a 3-step visual instruction (drag → go to AVA → click), (3) the actual bookmarklet drag link. Keep the install friction minimal — Brazilian mobile-first users may struggle with "drag to toolbar" on mobile; provide a fallback copy-to-address-bar flow for mobile.

---

| Feature | Type | Complexity | v1 dependency |
|---------|------|------------|---------------|
| Marketing landing page (`/`) with hero, value prop ("Gabarito instantâneo para provas UNIP"), and primary CTA ("Experimente grátis") | Table stakes | Low | Replaces or wraps existing `app/page.tsx` |
| 3-step visual onboarding section on landing page (drag bookmarklet → go to AVA → click → see gabarito) | Table stakes | Low | New section on landing page |
| Bookmarklet install page (`/bookmarklet`) — already exists, extend with overlay variant | Table stakes | Trivial | `app/bookmarklet/page.tsx` already built |
| Mobile-friendly bookmarklet fallback (copy the `javascript:` URI to clipboard, paste into address bar) | Table stakes | Low | Extends existing bookmarklet page |
| Pricing page (`/pricing`) — single tier R$9,90/mês, card + PIX, "Cancele quando quiser" | Table stakes | Low | New page |
| "Subscribe" CTA button linked to Stripe Checkout with pre-filled email if available | Table stakes | Low | Requires Stripe integration |
| Portuguese-language copy throughout (pt-BR) | Table stakes | Trivial | Content decision, not engineering |
| Demo/trial callout above paywall: "1 prova grátis, sem cadastro" | Table stakes | Trivial | Copy in paywall modal |
| FAQ section on landing page (common questions: privacy, accuracy, PIX safety) | Table stakes | Trivial | Static content |
| Student testimonials / social proof section | Differentiator | Trivial | Content, not engineering |
| Blog / SEO content targeting UNIP exam keywords | Anti-feature | High | Out of scope for MVP; can be added later with zero code changes |
| Email newsletter / waitlist before launch | Anti-feature | Med | Wrong funnel for this product; instant self-serve is the value prop |
| Multi-language (EN/PT-BR) | Anti-feature | Med | Audience is 100% Brazilian students |

---

## Category 5: User Tracking & Analytics

### Minimum viable tracking for a new SaaS

The "Aha moment" for this product is the first completed gabarito — when a student sees their confidence-colored answers in under 10 seconds. Every event below funnel must be traceable back to whether the user reached that moment.

**Activation event (most important):** `solve_completed` — the user submitted a test and received ≥1 answer. If they never reach this event, no other metric matters.

**Conversion events:** `paywall_shown` → `checkout_started` → `payment_succeeded`. Track the drop at each step to find where users abandon.

**Minimum stack:** PostHog (free tier, self-hostable, LGPD-friendly because data can stay in EU/BR) or Plausible (simpler, privacy-first). Do not use GA4 for an MVP — configuration overhead is high and LGPD compliance requires a cookie banner.

---

| Event / Feature | Type | Complexity | v1 dependency |
|----------------|------|------------|---------------|
| Anonymous visitor identified (cookie token assigned) | Table stakes | Low | Part of middleware/gating |
| `pageview` tracking on landing, pricing, solve, bookmarklet pages | Table stakes | Low | PostHog/Plausible snippet |
| `solve_started` event (user submitted HTML for solving) | Table stakes | Low | Add to existing `/api/solve` handler |
| `solve_completed` event with `question_count` and `mode` properties | Table stakes | Low | Add to existing solve flow |
| `paywall_shown` event (user hit the 402 gate) | Table stakes | Low | Triggered in client when 402 received |
| `checkout_started` event (user clicked subscribe CTA) | Table stakes | Low | Track before Stripe redirect |
| `payment_succeeded` event (from Stripe webhook or Stripe Checkout `success_url`) | Table stakes | Low | Server-side or Stripe-side event |
| Dashboard: test history for paying users (client-side localStorage, no server DB needed for MVP) | Differentiator | Low | Store solve results in localStorage |
| Funnel view in analytics dashboard (paywall_shown → checkout_started → payment_succeeded) | Table stakes | Trivial | PostHog funnel feature, zero code |
| `bookmarklet_installed` event (fire on `/bookmarklet` page load, or fire from overlay on first use) | Differentiator | Low | New event |
| `solve_via_overlay` event (distinguish web app vs overlay as solve surface) | Differentiator | Low | Add `source` param to `/api/solve` |
| Full session recording / heatmaps (e.g., Hotjar) at MVP | Anti-feature | Med | Overhead, LGPD consent complexity; defer |
| Mixpanel/Amplitude | Anti-feature | Med | Overkill for MVP volume; PostHog handles same use cases |
| Custom analytics database (ClickHouse, Redshift) | Anti-feature | High | Engineering cost without volume justification |

---

## Category 6: Rate Limiting & API Safeguards

### Why this matters for public exposure

The existing `/api/solve` has no authentication and no rate limiting — acceptable when the tool was private. Making it public means a single motivated user could run up Gemini API costs by hammering the endpoint. Rate limiting must go in before the public launch.

**Standard Next.js pattern:** Upstash Redis + `@upstash/ratelimit` package. Runs at the Edge in Next.js middleware. Use a sliding window algorithm. Key by visitor token (cookie) + IP as a fallback. Set aggressive limits on the `/api/solve` route (e.g., 3 solves per hour for free users, 30 per hour for subscribers).

---

| Feature | Type | Complexity | v1 dependency |
|----------------|------|------------|---------------|
| Per-token rate limit on `/api/solve` (Upstash Redis sliding window, free tier limit: 3/hour, subscriber limit: 30/hour) | Table stakes | Low–Med | Wraps existing `/api/solve` |
| IP-based rate limit as secondary key (Upstash, 10 requests/hour per IP) — protects against cookie-clearing abuse | Table stakes | Low | Middleware addition |
| Request body size limit on `/api/solve` (reject payloads > 5MB to prevent base64 image abuse) | Table stakes | Trivial | One middleware check |
| Gemini API key rotation or spending cap alert (set budget cap in Google AI Studio dashboard) | Table stakes | Trivial | External config, no code |
| Model input validation: reject requests with > 40 questions or > 30 images | Table stakes | Low | Add to existing route validation |
| Detailed 429 response with `Retry-After` header | Table stakes | Trivial | Part of rate limit implementation |
| CORS allowlist for overlay: only allow `ava.ead.unip.br` and `corretorunip.com.br` (or whatever domain) | Table stakes | Trivial | Response header config |
| Captcha on solve endpoint | Anti-feature | High | Breaks overlay UX completely; rate limiting is sufficient |
| Per-user spend tracking in DB | Anti-feature | Med | Upstash counters are sufficient; a full spend-tracking DB is over-engineered for this scale |

---

## Feature Dependencies

```
Middleware (cookie token) → Rate limiting → Freemium gate → Paywall modal
                                                         ↓
                                                  Stripe Checkout → Webhook handler → Grant access

Bookmarklet (existing) → Shadow DOM overlay → CORS on /api/solve → Streaming answers in panel
                                           → Auth token from Corretor domain
```

## MVP Priority Order

1. **Middleware + visitor token** — everything else depends on identifying returning visitors
2. **Upstash rate limiting + 402 gate** — must be in before public launch
3. **Stripe Checkout + PIX** — revenue; use hosted Checkout to minimize implementation
4. **Stripe webhook handler** — grant/revoke access on payment events
5. **Landing page + pricing page** — public face
6. **PostHog analytics** — activation tracking from day one
7. **Shadow DOM overlay** — highest UX value for repeat users, but can ship after initial gate

**Defer to post-MVP:**
- Test history dashboard (localStorage is sufficient; no server DB needed)
- Drag-to-resize overlay
- Trial period (free trial with PIX mandate is a good experiment but adds billing complexity)
- Re-authorization flow for revoked PIX mandates (email prompt — needs email infrastructure)

---

## PIX Subscription — Specific Implementation Notes

These are not table-stakes features but critical implementation decisions that affect architecture:

1. **Use Stripe Checkout hosted page** (not custom Elements) for the initial subscription flow. Checkout handles CPF collection, QR code display, PIX mandate authorization, and success/cancel redirects. Custom Elements would require building CPF collection and QR rendering from scratch.

2. **Set `payment_method_options[pix][mandate_options][amount]`** to at least the subscription price in centavos (990 for R$9,90). The customer authorizes this cap in their bank app — if you later raise the price, existing mandates will need re-authorization.

3. **Grant 7-day grace period on failed renewal** — PIX retry window is up to 7 days. Do not lock on `invoice.payment_failed`; lock only on `invoice.payment_failed` + no retry remaining, or after the grace period.

4. **Handle `mandate.updated`** — when a customer revokes their PIX Automático mandate in their bank app, Stripe fires this webhook. The app must catch it and downgrade the customer's access, then send an email with a re-subscribe link.

5. **One-time PIX QR codes expire in 4 hours by default** (configurable up to 14 days). For the subscription flow this is handled by Stripe Checkout automatically — the QR is part of the mandate authorization, not a payment QR.

---

## Sources

- [Stripe PIX Payments Documentation](https://docs.stripe.com/payments/pix)
- [Stripe PIX Automático Documentation](https://docs.stripe.com/payments/pix/pix-automatico)
- [Set up a subscription with Pix — Stripe](https://docs.stripe.com/billing/subscriptions/pix)
- [Stripe changelog: Pix recurring payments support (2026-04-22)](https://docs.stripe.com/changelog/dahlia/2026-04-22/pix-recurring-payments-support)
- [Anonymous website visitor identification — Factors.ai](https://www.factors.ai/blog/anonymous-website-visitor-identification-guide)
- [Shadow DOM CSS Isolation — DEV Community](https://dev.to/issuecapture/shadow-dom-css-isolation-how-to-embed-a-widget-without-breaking-the-host-page-4oio)
- [Rate Limiting Next.js API Routes with Upstash — Upstash Blog](https://upstash.com/blog/nextjs-ratelimiting)
- [SaaS Freemium Conversion Rates 2026 — First Page Sage](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)
- [Freemium Conversion Funnel Metrics — Userpilot](https://userpilot.com/blog/saas-funnel-metrics/)
- [Building bookmarklet with Shadow DOM — DEV Community](https://dev.to/seryl_lns_bf77ba67bf2953f/building-a-product-clipper-bookmarklet-with-shadow-dom-and-structured-data-iid)
