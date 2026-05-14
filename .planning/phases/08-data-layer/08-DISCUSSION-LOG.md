# Phase 8: Data Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 8-Data Layer
**Areas discussed:** Local dev environment, Migration strategy, Status enum approach, Validation method

---

## Local Dev Environment

| Option | Description | Selected |
|--------|-------------|----------|
| docker-compose.yml | Isolated local containers, safe to destroy, no VPS risk | |
| Point to VPS directly | Dev env uses DATABASE_URL + REDIS_URL pointing to production VPS | |
| Managed free tier (Neon + Upstash) | Free managed Postgres + Redis for dev only | |
| Existing Docker Desktop containers | Reuse containers already running for clanker_poker project | ✓ |

**User's choice:** Reuse existing Docker Desktop containers (both Postgres and Redis already running for the clanker_poker project). Create a new database inside the existing Postgres container.
**Notes:** No new docker-compose.yml needed. DATABASE_URL will point to the existing container with a new database name (e.g., `corretor_unip_dev`).

---

## Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual npm script | `npm run db:migrate` -- developer runs explicitly | ✓ |
| Auto on Next.js startup via instrumentation.ts | Migrations run on every cold start | |
| You decide | Leave approach to the planner | |

**User's choice:** Manual npm script (recommended option).
**Notes:** Clean separation -- app start never triggers schema changes. `instrumentation.ts` is explicitly NOT used for migrations.

---

## Status Enum Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres pgEnum | `pgEnum('subscription_status', [...])` -- DB enforces valid values | ✓ |
| Plain string column + TypeScript union | varchar column, no DB constraint | |
| You decide | Leave to the planner | |

**User's choice:** pgEnum -- and requested an additional `onhold` status beyond the default set.
**Notes:** Final enum values: `['active', 'cancelled', 'expired', 'onhold']`. The `onhold` status is for PIX mandate pending states and subscription pauses.

---

## Validation Method

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest integration test | Write/read test in lib/db.test.ts + Redis key test | ✓ |
| Standalone npm scripts | npm run db:seed + npm run redis:test | |
| Manual only -- README instructions | Document steps, run by hand | |

**User's choice:** Vitest integration test (recommended option).
**Notes:** Fits existing Vitest setup. Tests should be taggable to exclude from unit-only runs.

---

## Claude's Discretion

None -- user made explicit choices for all four areas.

## Deferred Ideas

- **"Fix image questions via bookmarklet or extension (CORS-safe)"** -- a pending todo that matched Phase 8 on weak keywords. Not relevant to the data layer; deferred to Phase 13 (Bookmarklet v2).
