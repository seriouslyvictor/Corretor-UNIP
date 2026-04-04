# Corretor UNIP

## What This Is

An AI-powered test-solving tool for UNIP students. The user provides a saved HTML page from the UNIP review portal (file upload or paste), the app parses all questions and images, sends them in batch to an LLM, and displays a gabarito with the correct answer per question. A legacy single-file version (`gabarito.html`) handles the current use case (showing answers from already-corrected pages); v2 adds LLM intelligence to actually *solve* the questions.

## Core Value

Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.

## Requirements

### Validated

- ✓ HTML parsing via DOMParser extracts questions, options, and correct answers — existing (gabarito.js)
- ✓ Gabarito grid display (question number + answer letter) — existing (gabarito.html)
- ✓ File upload + paste textarea input — existing (gabarito.html)
- ✓ Dark/light theme with `d` hotkey toggle — existing (Next.js scaffold)

### Active

_(all v1.0 requirements validated — see Validated section)_

### Validated (continued)

- ✓ Port HTML parser to TypeScript (`lib/parser.ts`) — Validated in Phase 01: parser-foundation
- ✓ HTML input UI in Next.js — file upload + paste textarea — Validated in Phase 01: parser-foundation
- ✓ `POST /api/solve` route — ndjson streaming, Gemini via Vercel AI SDK — Validated in Phase 02: llm-integration
- ✓ Structured LLM output via Zod schemas — `SolvedAnswer` with answer, confidence, explanation — Validated in Phase 02: llm-integration
- ✓ Mode selector — "No BS" vs "Verbose" — Validated in Phase 02: llm-integration
- ✓ Gabarito results page — progressive streaming grid + expandable verbose cards — Validated in Phase 03: gabarito-ui
- ✓ LLM routing — complexity classifier routes reasoning vs fact-recall questions — Validated in Phase 02: llm-integration

### Out of Scope

- Database / persistence — MVP only, no user data stored
- Authentication / user accounts — no login, no session management
- URL-based HTML fetching — UNIP portal requires login; file upload avoids auth complexity
- Multiple LLM providers simultaneously — single provider per deploy, swappable via one import

## Context

- Legacy tool (`gabarito.html` / `gabarito.js` / `gabarito.css`) is production-ready and in use — it reads answers from already-corrected review pages. v2 replaces this with LLM-powered solving before correction is shown.
- Next.js 15 scaffold with shadcn/ui, Tailwind v4, and `next-themes` is in place but has no feature code yet.
- Vercel AI SDK is chosen for provider-agnostic LLM access — Gemini is the default (strong world knowledge, multimodal, generous free tier). Swap to Claude/OpenAI is a single import change.
- UNIP test pages have a predictable DOM structure: `li.liItem` → `h3` (question number), `.vtbegenerated p` (question text), `.answerNumLabelSpan` / `.answerTextSpan` (options), `.correctAnswerFlag` (current-tool answer marker not used in v2).
- Some questions are pure fact recall (common in Brazilian academic context); others require logical reasoning. Both types appear in the same test.
- No deployment target confirmed yet — Vercel is assumed.

## Constraints

- **Tech Stack**: Next.js 15 + Vercel AI SDK + shadcn/ui + Tailwind v4 — decided, not open for revision
- **LLM Provider**: Google Gemini via `@ai-sdk/google` for MVP — chosen for multimodal support and free tier
- **No persistence**: No database, no server-side state — all processing is stateless per request
- **Environment**: `GOOGLE_GENERATIVE_AI_API_KEY` required in `.env.local`; no other secrets for MVP

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vercel AI SDK over direct Gemini SDK | Provider-agnostic — swap model with one import line | — Pending |
| generateObject() with Zod over streaming text | Structured output avoids parsing LLM free text; reliable letter extraction | — Pending |
| Client-side parsing, server-side LLM | Parser runs in browser (DOMParser available); LLM key stays server-side | — Pending |
| No BS / Verbose mode selector | Different prompt strategies for different use cases — quick lookup vs. study | — Pending |
| LLM routing for think vs. recall | Avoid wasting reasoning tokens on pure memorization questions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after initialization*
