# Milestones

## v1 MVP — 2026-04-04

**Shipped:** 2026-04-04
**Timeline:** 2026-03-22 → 2026-04-04 (13 days)
**Phases:** 3 | **Plans:** 8 | **Commits:** 55
**Files touched:** 74 | **LOC:** +15,579

### Delivered

Given a UNIP take-test HTML page, parse every question client-side, stream answers from Gemini, and display a gabarito grid with confidence-colored letters — with No BS and Verbose modes.

### Key Accomplishments

1. TypeScript parser (`lib/parser.ts`) with correct UNIP take-test DOM selectors and 12-test Vitest suite
2. Shared Zod schemas (`lib/schemas.ts`) as cross-layer contract for parser / UI / API
3. Streaming `/api/solve` route via Vercel AI SDK — avoids Vercel Hobby 10 s timeout
4. LLM complexity classifier routing fact-recall vs. reasoning questions per thinkingBudget
5. No BS / Verbose mode selector with mode-aware prompt builder (`lib/prompts.ts`)
6. Gabarito results UI: progressive skeleton grid + expandable verbose cards + error cells with retry

### Archive

- `.planning/milestones/v1-ROADMAP.md`
- `.planning/milestones/v1-REQUIREMENTS.md`
