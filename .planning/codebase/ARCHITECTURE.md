# Architecture
_Last updated: 2026-03-31_

## Summary

Corretor UNIP is in active transition from a zero-dependency single-file HTML tool (`gabarito.html`) to a full Next.js 16 application using the App Router. The Next.js scaffold is currently a clean baseline with no feature code yet — all product logic still lives in the legacy files at the repo root. The planned v2 architecture (documented in `docs/ARCHITECTURE.md`) introduces an AI-powered LLM layer via Vercel AI SDK sitting behind a `POST /api/solve` route, converting the client-side-only parser into a client + server-side pipeline.

---

## Details

### Current State: Two Parallel Systems

#### System A — Legacy Static Tool (production-ready, in use)

Files: `gabarito.html`, `gabarito.js`, `gabarito.css` (repo root)

Pattern: Vanilla JS, zero dependencies, single-page with two view states toggled via CSS classes.

Data flow:
1. User loads a saved UNIP test review `.html` file **or** pastes raw HTML source into a textarea.
2. `gabarito.js:processHTML()` uses `DOMParser` to parse the raw HTML string in-browser.
3. Parser queries `li.liItem` elements, reads `Pergunta N` from `h3`, finds `.correctAnswerFlag` within `.reviewQuestionsAnswerDiv`, extracts the letter from `.answerNumLabelSpan`.
4. Results are sorted by question number and rendered as a CSS grid of `.gabarito-item` divs.
5. State is managed entirely by CSS class toggling (`hidden` / `active`) on `#inputScreen` and `#resultScreen` — no JS state object.

No network calls. Fully offline. No build step.

#### System B — Next.js v2 Scaffold (early stage, not yet functional)

Files:
- `app/layout.tsx` — Root layout (React Server Component). Loads Google Fonts (Montserrat, Oxanium, Geist Mono), wraps children in `<ThemeProvider>`.
- `app/page.tsx` — Placeholder page (RSC). Renders a "Project ready!" scaffold message with a single `<Button>` component.
- `app/globals.css` — Global CSS with Tailwind v4 imports, full shadcn/ui CSS variable token system (oklch color space), light/dark mode definitions.
- `components/theme-provider.tsx` — Client Component (`"use client"`). Wraps `next-themes` `ThemeProvider`. Includes a `ThemeHotkey` sub-component that listens for `d` keypress to toggle dark/light mode.
- `components/ui/button.tsx` — shadcn/ui Button component using `class-variance-authority` for variants and `radix-ui` Slot for `asChild` composition.
- `lib/utils.ts` — Single `cn()` utility combining `clsx` + `tailwind-merge`.

### Planned v2 Architecture (from `docs/ARCHITECTURE.md`)

**Pattern:** Next.js App Router with RSC for layout/pages and Client Components for interactive UI. API Routes for server-side LLM calls.

**Core data flow:**

```
Browser (Client)
  └─ User provides HTML (file upload or paste)
  └─ Parser extracts questions/options/images (client-side, port of gabarito.js)
  └─ User selects mode: "No BS" or "Verbose"
  └─ POST /api/solve  →  { mode, questions[] }
       └─ Server builds prompts per question
       └─ Calls LLM via Vercel AI SDK (generateObject with Zod schema)
       └─ Returns JSON: [{ number, answer, explanation? }]
  └─ Browser renders gabarito grid
```

**Planned API route:** `app/api/solve/route.ts`
- Accepts `POST` with `{ mode: "verbose" | "nobs", questions: Question[] }`
- Uses Vercel AI SDK `generateObject()` with structured Zod output schema
- Default LLM: Google Gemini via `@ai-sdk/google` (swappable to Claude/OpenAI with one import change)
- Returns JSON array of `{ number, answer, explanation? }` per question

### RSC vs Client Component Boundary

| File | Directive | Reason |
|---|---|---|
| `app/layout.tsx` | RSC (default) | Static layout shell, no interactivity |
| `app/page.tsx` | RSC (default) | Static scaffold placeholder |
| `components/theme-provider.tsx` | `"use client"` | Uses `useTheme`, `useEffect`, event listeners |
| `components/ui/button.tsx` | RSC-compatible | No hooks; `asChild` uses Slot, not state |

When feature components are built, the HTML input/paste area, mode selector, and solver trigger will be Client Components. The gabarito result grid may be either RSC (if server-rendered after solve) or a Client Component (if rendered from client-held state).

### State Management

Current (legacy): No state library. CSS class toggles manage view state entirely.

Planned (v2): No state library planned. Component-local `useState` for form inputs and results. `next-themes` handles dark/light preference via `localStorage` + CSS class on `<html>`.

### Theme System

`next-themes` with `attribute="class"` strategy. Dark mode adds `.dark` class to `<html>`. CSS variables defined in `app/globals.css` under `:root` (light) and `.dark` (dark) using oklch color space. Toggled by pressing `d` anywhere outside form inputs.

### Error Handling

Legacy tool: Shows inline error text in `#errorMsg` div when parsing fails (no questions found, no correct answers found).

v2 planned: Not yet implemented. API route error handling strategy not defined.

---

## Gaps / Unknowns

- No API routes exist yet. The `POST /api/solve` endpoint from `docs/ARCHITECTURE.md` is not implemented.
- No `lib/parser.ts` TypeScript port of the legacy parser exists yet.
- No `lib/schemas.ts` Zod schemas exist yet.
- Vercel AI SDK (`ai`, `@ai-sdk/google`) is not in `package.json` yet — it is planned, not installed.
- No route for `/gabarito` results page exists yet (planned at `app/gabarito/page.tsx`).
- No feature components exist yet (`html-input.tsx`, `mode-selector.tsx`, `gabarito-grid.tsx`, `question-card.tsx`).
- Whether the gabarito result page will use URL state (query params, `useSearchParams`) or client-side state (Context, `useState` lifted) is not decided.
- No loading/streaming strategy defined for LLM calls (streaming vs. single response).
- No error boundary or error UI patterns established.
- Deployment target (Vercel assumed based on Vercel AI SDK choice) not confirmed in config.
