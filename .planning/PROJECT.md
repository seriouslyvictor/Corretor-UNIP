# Corretor UNIP

## What This Is

An AI-powered test-solving tool for UNIP students. The user provides a saved HTML page from the UNIP take-test portal (file upload or paste), the app parses all questions and images client-side, sends them in batch to Gemini via streaming, and displays a gabarito with the correct answer per question.

## Core Value

Given a UNIP test HTML page, return the correct answer for every question — fast, with no friction.

## Current State

**Shipped:** v1 MVP (2026-04-04)

The full v1 flow is working end-to-end:
- HTML input (file upload + paste textarea) with client-side parsing
- POST /api/solve streaming route (Gemini 2.5 Flash, ndjson, avoids 10s timeout)
- No BS mode (answer only) and Verbose mode (answer + explanation per question)
- Gabarito grid with progressive skeleton fill and confidence-colored letters
- Expandable QuestionCard verbose cards (native `<details>/<summary>`)
- LLM complexity routing (fact-recall vs reasoning via thinkingBudget)

## Next Milestone Goals

_Not yet defined. Candidates from v2 requirements:_
- UX-01: Toggle mode after results without re-parsing
- UX-02: Copy gabarito to clipboard
- DEPLOY-01: Vercel production deployment
- PROV-01: Provider selector UI (Gemini / Claude / OpenAI)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vercel AI SDK over direct Gemini SDK | Provider-agnostic — swap model with one import | Validated |
| streamText + Output.array() over generateObject | generateObject deprecated in AI SDK 6; structured streaming still achievable | Validated |
| Client-side parsing, server-side LLM | DOMParser available in browser; LLM key stays server-side | Validated |
| No BS / Verbose mode selector | Different prompt strategies — quick lookup vs. study | Validated |
| LLM routing for think vs. recall | Avoid wasting reasoning tokens on pure memorization questions | Validated |
| thinkingBudget: -1 (Verbose) / 0 (No BS) | Dynamic reasoning for complex; zero for pure recall | Validated |
| Custom ReadableStream for streaming | toDataStreamResponse() not available in ai@6.0.145 | Validated |
| Native details/summary for QuestionCard | Semantic, accessible, zero-dependency | Validated |

## Constraints

- **Tech Stack**: Next.js 15 + Vercel AI SDK + shadcn/ui + Tailwind v4
- **LLM Provider**: Google Gemini via `@ai-sdk/google` (multimodal, free tier)
- **No persistence**: Stateless per request — no database, no server state
- **Environment**: `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` (server-side only)

## Context

- Legacy tool (`gabarito.html` / `gabarito.js`) reads answers from already-corrected review pages and remains in the repo for reference
- v1 solves uncorrected take-test pages using LLM intelligence
- UNIP take-test DOM: `div.takeQuestionDiv` → `h3.steptitle` (number) → `legend.legend-visible` (text) → `table.multiple-choice-table` (options)
- DOM differs from review-page structure — parser was rewritten post-checkpoint during Phase 1

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database / persistence | Stateless MVP — no user data stored |
| Authentication / user accounts | Single-user local tool |
| URL-based HTML fetching | UNIP portal requires login; file upload avoids auth complexity |
| Multiple simultaneous LLM providers | Single provider per deploy; swappable via one import |

<details>
<summary>v1 Planning History</summary>

- Phase 1: Foundation — parser, schemas, input UI (completed 2026-04-03)
- Phase 2: LLM Integration — /api/solve, streaming, modes, routing (completed 2026-04-03)
- Phase 3: Gabarito UI — results grid, verbose cards, loading/error states (completed 2026-04-04)
- Full archive: `.planning/milestones/v1-ROADMAP.md`

</details>

---
*Last updated: 2026-04-04 after v1 milestone completion*
