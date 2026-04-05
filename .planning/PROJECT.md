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

## Current Milestone: v1.1 Photo Scan Support

**Goal:** Allow users to photograph a physical UNIP test paper and get the same gabarito output via Gemini vision extraction.

**Target features:**
- New "Photo Scan" input mode (file upload + in-browser camera capture)
- Multi-image upload (one photo per page)
- Gemini vision pass to extract questions from images with user review step
- Reuse existing `/api/solve` route with extracted questions
- Same confidence-colored gabarito grid output

## Requirements

### Validated

- ✓ HTML file upload + paste input — Phase 1
- ✓ Client-side UNIP DOM parser — Phase 1
- ✓ POST /api/solve streaming route (Gemini 2.5 Flash) — Phase 2
- ✓ No BS / Verbose mode selector — Phase 2
- ✓ LLM complexity routing (thinkingBudget) — Phase 2
- ✓ Gabarito grid with confidence-colored letters — Phase 3
- ✓ Expandable QuestionCard verbose cards — Phase 3
- ✓ Error cells with per-question retry — Phase 3

### Active

- [ ] Photo Scan input mode (file upload + camera capture)
- [ ] Multi-image upload for multi-page tests
- [ ] Vision extraction route — send images to Gemini, return ParsedQuestion[]
- [ ] Extracted question review UI before solving
- [ ] Reuse /api/solve with vision-extracted questions

### Out of Scope

| Feature | Reason |
|---------|--------|
| Database / persistence | Stateless MVP — no user data stored |
| Authentication / user accounts | Single-user local tool |
| URL-based HTML fetching | UNIP portal requires login; file upload avoids auth complexity |
| Multiple simultaneous LLM providers | Single provider per deploy; swappable via one import |

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

<details>
<summary>v1 Planning History</summary>

- Phase 1: Foundation — parser, schemas, input UI (completed 2026-04-03)
- Phase 2: LLM Integration — /api/solve, streaming, modes, routing (completed 2026-04-03)
- Phase 3: Gabarito UI — results grid, verbose cards, loading/error states (completed 2026-04-04)
- Full archive: `.planning/milestones/v1-ROADMAP.md`

</details>

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 — Milestone v1.1 Photo Scan Support started*
