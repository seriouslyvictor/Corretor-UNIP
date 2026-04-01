# CONCERNS
_Last updated: 2026-03-31_

## Summary

The project is mid-migration between a fully working single-file legacy tool (`gabarito.html` + `gabarito.js` + `gabarito.css`) and an empty Next.js 16 scaffold. The scaffold currently contains zero application logic — no parser, no API route, no UI beyond a boilerplate placeholder page. The planned v2 features (AI-powered solving via Vercel AI SDK, structured LLM output, image extraction) are entirely unimplemented. The primary risks are the wide gap between the working legacy tool and the new codebase, complete absence of tests, no error-boundary strategy for LLM calls, and an undocumented dependency on UNIP's private HTML structure that could break silently at any time.

---

## Tech Debt

**Vanilla JS legacy tool not portable as-is — HIGH**
- Issue: `gabarito.js` is plain ES5-style JS with `var`, `function` declarations, DOM manipulation via `innerHTML`, and inline event handlers (`onclick="parseFromPaste()"`). It cannot be imported into TypeScript modules without a full rewrite.
- Files: `gabarito.js`, `gabarito.html`
- Impact: Blocks any code reuse between legacy and Next.js. Architecture doc says "Reuses existing parsing logic" but the logic is not reusable without a port.
- Fix approach: Rewrite as `lib/parser.ts` with typed inputs/outputs matching the schema in `docs/ARCHITECTURE.md`.

**`app/page.tsx` is scaffolding boilerplate — HIGH**
- Issue: Contains Next.js template placeholder text ("Project ready!", "You may now add components and start building."). No application functionality exists.
- Files: `app/page.tsx`
- Impact: The app does nothing. The entire core flow (HTML input → parse → solve → display gabarito) is missing.
- Fix approach: Replace with `html-input.tsx` component wiring file upload and paste textarea to the parser.

**`README.md` is the Next.js template README — MEDIUM**
- Issue: The README describes the shadcn/ui scaffold template, not this project. No setup instructions, no description of the tool, no mention of required environment variables.
- Files: `README.md`
- Impact: Onboarding friction. Anyone cloning the repo has no idea what the project is or how to configure it.
- Fix approach: Replace with project-specific README covering purpose, setup, and required env vars.

**`lang="en"` in layout — LOW**
- Issue: `app/layout.tsx` sets `lang="en"` but the app is a Portuguese-language tool for Brazilian university students.
- Files: `app/layout.tsx`
- Impact: Accessibility and SEO signal mismatch.
- Fix approach: Change to `lang="pt-BR"`.

**Unused Google Fonts loaded (Geist, Geist_Mono) — LOW**
- Issue: `app/layout.tsx` imports `Geist` and `Geist_Mono` from `next/font/google` but only `Oxanium` and `Montserrat` are applied as CSS variables. `Geist` and `Geist_Mono` are imported but their variables are never used in `className`.
- Files: `app/layout.tsx`
- Impact: Unnecessary font downloads on every page load.
- Fix approach: Remove unused `Geist` and `Geist_Mono` imports.

---

## Security Concerns

**API key exposure risk — HIGH**
- Risk: The planned `POST /api/solve` route will require `GOOGLE_GENERATIVE_AI_API_KEY` (or equivalent for Anthropic/OpenAI). This key must never be committed or hardcoded. No `.env.local` file exists yet.
- Files: None yet — risk is in future `app/api/solve/route.ts`
- Current mitigation: No API route exists yet; key is not committed.
- Recommendations: Document required env vars prominently in README. Add `.env.local` to `.gitignore` (it already is via the default Next.js `.gitignore`). Consider adding a startup check that throws early if the key is missing.

**No rate limiting on `/api/solve` — MEDIUM**
- Risk: The planned API route will make LLM API calls on every request. Without rate limiting, a single user (or bot) could exhaust the API quota or incur unexpected costs.
- Files: Future `app/api/solve/route.ts`
- Current mitigation: Route does not exist yet.
- Recommendations: Add simple request-level throttling or use Vercel's built-in Edge rate limiting before deploying publicly.

**Untrusted HTML parsed client-side — LOW**
- Risk: `gabarito.js` uses `DOMParser` to parse user-supplied HTML, then reads text content via `.textContent` and `escapeHtml()`. The current tool does not execute scripts from parsed HTML (DOMParser is safe for this), but the Next.js port must maintain this boundary — specifically, image `src` values extracted for base64 conversion should be validated before being sent to the API.
- Files: `gabarito.js` (legacy), future `lib/parser.ts`
- Current mitigation: `escapeHtml()` is used for rendered output; DOMParser does not execute scripts.
- Recommendations: When porting parser, sanitize extracted image `src` values and reject `data:` URIs from unknown origins before forwarding to the LLM API.

---

## Missing Pieces

The following items are documented in `docs/ARCHITECTURE.md` as planned but do not exist in the codebase:

**`lib/parser.ts`** — TypeScript port of `gabarito.js` HTML parser. Extracts question number, text, options (letter + text), and images. Does not exist; only placeholder `lib/.gitkeep` is present.

**`lib/schemas.ts`** — Zod schemas for LLM structured output (`generateObject()`). Does not exist.

**`app/api/solve/route.ts`** — Server-side LLM endpoint. Does not exist. Entire AI integration is missing.

**`app/gabarito/page.tsx`** — Results display route. Does not exist; no `app/gabarito/` directory exists.

**`components/html-input.tsx`** — File upload + paste UI. Does not exist.

**`components/mode-selector.tsx`** — Verbose vs No BS toggle. Does not exist.

**`components/gabarito-grid.tsx`** — Answer grid display component. Does not exist.

**`components/question-card.tsx`** — Verbose mode expandable card. Does not exist.

**Test suite** — No test framework configured. `package.json` has no `test` script. No test files exist anywhere in the project. The legacy tool has no tests either.

**Error boundaries / loading states** — No React error boundaries, no `loading.tsx`, no `error.tsx` in `app/`. LLM calls can fail; there is no plan for surfacing failures to the user gracefully.

**`@ai-sdk/*` and `ai` packages** — Not installed. `package.json` lists no AI SDK dependencies. The entire AI integration stack (`ai`, `@ai-sdk/google`, `zod`) must be installed before any LLM work can begin.

---

## Migration Gaps

**Parser logic not ported**
- Legacy: `gabarito.js` queries `.liItem`, `.reviewQuestionsAnswerDiv`, `.correctAnswerFlag`, `.answerNumLabelSpan` — brittle CSS class selectors tied to UNIP's internal HTML structure.
- New: No parser exists in `lib/`.
- Gap: Port must add image extraction (`.vtbegenerated p img`) on top of existing text extraction. The legacy tool ignores images entirely.

**No answer-mode concept in legacy tool**
- Legacy: Always shows correct answers extracted directly from the HTML (no LLM, no Verbose/No BS toggle).
- New: Verbose and No BS modes are planned but require LLM integration that does not exist.
- Gap: The mode-selection UI and its wiring to the API route are both absent.

**CSS design language not unified**
- Legacy: Custom dark theme using hardcoded hex values (`#1a1a2e`, `#e94560`, `#4ecca3`, `#16213e`).
- New: Tailwind CSS v4 + shadcn/ui using CSS variables and the default shadcn color system.
- Gap: The legacy color palette and gabarito grid visual design must be intentionally translated to Tailwind tokens — it will not happen automatically.

**Single-file vs. multi-route architecture**
- Legacy: All state is ephemeral — page shows input screen, hides it, shows results, nothing persists.
- New: Architecture doc specifies a separate `app/gabarito/page.tsx` route for results, implying state must be passed (via URL params, `sessionStorage`, or React context) between input and results pages. No mechanism for this is implemented.

**No deployment configuration**
- Legacy: Static files deployable anywhere (no server needed).
- New: Next.js app requires a Node.js runtime or Vercel deployment. No `vercel.json`, no CI workflow, no environment variable documentation for deployment.

---

## Gaps / Unknowns

**UNIP HTML structure stability** — The parser depends on private CSS class names (`.liItem`, `.reviewQuestionsAnswerDiv`, `.correctAnswerFlag`, `.answerNumLabelSpan`) inside UNIP's test review pages. It is unknown if UNIP has changed or plans to change this structure. A silent change would produce empty results with no clear error.

**LLM accuracy on UNIP exam questions** — It is untested whether Gemini (or any configured model) produces correct answers for UNIP's specific exam format, especially for questions with images or discipline-specific content. No benchmark or evaluation plan exists.

**Image handling strategy** — The architecture doc mentions converting images to base64 or URL, but UNIP's review pages may embed images as external URLs requiring authentication, or as inline data URIs. The actual format of images in UNIP HTML has not been analyzed.

**Cost model** — No estimate of LLM API cost per exam solve. With potentially 30+ questions per exam and multimodal inputs, costs could be non-trivial if the tool is used heavily or shared publicly.

**Vercel AI SDK version** — `ai` and `@ai-sdk/google` are not in `package.json` yet. The installed version will determine which `generateObject()` API shape applies; the architecture doc shows patterns that may differ between Vercel AI SDK v3 and v4.
