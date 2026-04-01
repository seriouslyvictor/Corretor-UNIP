# Codebase Structure
_Last updated: 2026-03-31_

## Summary

The repository contains two coexisting systems: a legacy standalone HTML tool at the root and a Next.js 16 App Router scaffold in `app/`. The Next.js portion is a clean baseline with only framework boilerplate — no feature directories or API routes exist yet. The planned feature structure is documented in `docs/ARCHITECTURE.md` and has not been built.

---

## Details

### Directory Layout

```
D:/Corretor UNIP/                  # Repo root
├── app/                           # Next.js App Router root
│   ├── globals.css                # Global styles + CSS variable tokens
│   ├── layout.tsx                 # Root layout (RSC) — fonts, ThemeProvider
│   ├── page.tsx                   # "/" route — scaffold placeholder
│   └── favicon.ico
├── components/                    # Shared React components
│   ├── theme-provider.tsx         # Dark/light mode wrapper (Client Component)
│   └── ui/                        # shadcn/ui primitives
│       └── button.tsx
├── hooks/                         # Custom React hooks (empty, .gitkeep only)
├── lib/                           # Shared utilities
│   └── utils.ts                   # cn() — clsx + tailwind-merge
├── public/                        # Static assets (empty, .gitkeep only)
├── docs/
│   └── ARCHITECTURE.md            # v2 feature plan and architecture spec
├── gabarito.html                  # Legacy tool — entry point (standalone)
├── gabarito.js                    # Legacy tool — all logic
├── gabarito.css                   # Legacy tool — all styles
├── next.config.mjs                # Next.js config (empty/default)
├── tsconfig.json                  # TypeScript config
├── components.json                # shadcn/ui CLI config
├── package.json                   # Dependencies and scripts
├── pnpm-lock.yaml                 # pnpm lockfile
├── postcss.config.mjs             # PostCSS (Tailwind v4 via @tailwindcss/postcss)
├── eslint.config.mjs              # ESLint config
└── .prettierrc                    # Prettier config
```

### Directory Purposes

**`app/`**
- Purpose: Next.js App Router. Every `page.tsx` inside becomes a route segment. `layout.tsx` wraps all child routes.
- Current routes: `/` only (`app/page.tsx`).
- Planned routes: `/gabarito` (`app/gabarito/page.tsx`), `/api/solve` (`app/api/solve/route.ts`).

**`components/`**
- Purpose: Reusable React components shared across routes.
- `components/ui/` — shadcn/ui primitive components added via `npx shadcn@latest add <name>`. Currently only `button.tsx`.
- `components/` root — application-level components. Currently only `theme-provider.tsx`.

**`hooks/`**
- Purpose: Custom React hooks. Currently empty (`.gitkeep` placeholder).
- Expected use: form state hooks, parser hooks, solver state hook.

**`lib/`**
- Purpose: Non-React utilities and shared business logic.
- Currently: `utils.ts` with `cn()` only.
- Planned: `parser.ts` (TypeScript port of `gabarito.js` logic), `schemas.ts` (Zod schemas for LLM output).

**`public/`**
- Purpose: Static assets served at `/`. Currently empty.

**`docs/`**
- Purpose: Internal planning documents. `docs/ARCHITECTURE.md` contains the full v2 feature specification and planned file structure.

**Root legacy files**
- `gabarito.html`, `gabarito.js`, `gabarito.css` — the original working tool. Not integrated into the Next.js build. Opened directly in a browser.

### Key File Locations

**Entry Points:**
- `app/layout.tsx` — Next.js root layout, wraps every page
- `app/page.tsx` — "/" route, first page users land on
- `gabarito.html` — Legacy tool entry, opened directly in browser

**Configuration:**
- `tsconfig.json` — TypeScript config; `@/*` path alias maps to repo root
- `components.json` — shadcn/ui config; style: `radix-luma`, iconLibrary: `phosphor`
- `next.config.mjs` — Next.js config (currently empty defaults)
- `app/globals.css` — All CSS variables (color tokens, radius, fonts)

**Core Logic:**
- `gabarito.js` — Legacy HTML parser (all product logic currently lives here)
- `lib/utils.ts` — `cn()` utility

**Theme:**
- `components/theme-provider.tsx` — `next-themes` integration + `d` hotkey

### Naming Conventions

**Files:**
- Next.js special files: lowercase (`page.tsx`, `layout.tsx`, `route.ts`, `globals.css`)
- React components: kebab-case (`theme-provider.tsx`, `button.tsx`)
- Utilities: kebab-case (`utils.ts`)
- Planned feature components follow kebab-case: `html-input.tsx`, `mode-selector.tsx`, `gabarito-grid.tsx`, `question-card.tsx`

**Directories:**
- Next.js route segments: kebab-case (`api/solve/`, `gabarito/`)
- Feature directories: kebab-case (`components/ui/`)
- Top-level dirs: lowercase single word (`app`, `components`, `hooks`, `lib`, `public`, `docs`)

**React components (in code):** PascalCase (`ThemeProvider`, `Button`, `ThemeHotkey`)

**Functions/utilities:** camelCase (`cn`, `processHTML`, `parseFromPaste`, `showResults`)

### Path Aliases

Defined in `tsconfig.json` and `components.json`:

| Alias | Resolves To |
|---|---|
| `@/*` | `./` (repo root) |
| `@/components` | `./components` |
| `@/components/ui` | `./components/ui` |
| `@/lib` | `./lib` |
| `@/lib/utils` | `./lib/utils` |
| `@/hooks` | `./hooks` |

### Where to Add New Code

**New page/route:**
- Create `app/<route-segment>/page.tsx`
- Example: `app/gabarito/page.tsx` for the results page

**New API route:**
- Create `app/api/<name>/route.ts`
- Example: `app/api/solve/route.ts` for the LLM endpoint

**New shadcn/ui primitive:**
- Run `npx shadcn@latest add <component-name>`
- Lands in `components/ui/<component-name>.tsx`

**New application component:**
- Place in `components/<feature-name>.tsx`
- Import with `@/components/<feature-name>`

**New utility/business logic:**
- Place in `lib/<module-name>.ts`
- Import with `@/lib/<module-name>`

**New custom hook:**
- Place in `hooks/use-<name>.ts`
- Import with `@/hooks/use-<name>`

### Special Directories

**`.planning/`**
- Purpose: GSD planning documents (phases, codebase analysis)
- Generated: No (hand-maintained / agent-written)
- Committed: Yes

**`.claude/`**
- Purpose: Claude project memory and context files
- Committed: Yes (project-specific memory)

**`.next/`** (not present in tree, generated at runtime)
- Purpose: Next.js build output and dev cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`**
- Generated: Yes (pnpm)
- Committed: No

---

## Gaps / Unknowns

- `hooks/` and `public/` are empty — no conventions established for hook file naming beyond the planned pattern.
- No test directory exists or is planned in the visible structure. Testing approach is undefined.
- `gabarito.html`/`gabarito.js`/`gabarito.css` will likely be removed or moved once the Next.js app reaches feature parity — no migration plan documented.
- No `middleware.ts` — no auth or request interception planned currently.
- No `app/error.tsx` or `app/not-found.tsx` — error UI routes not scaffolded.
- Icon library (`@phosphor-icons/react`) is installed per `package.json` but no icons are used yet in any component.
