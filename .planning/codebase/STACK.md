# Technology Stack

_Last updated: 2026-03-31_

## Summary

Corretor UNIP v2 is a Next.js 16 application using the App Router, built with React 19, TypeScript 5, and Tailwind CSS v4. The project is scaffolded and currently at the "empty canvas" stage — the core UI shell (theme, layout, one Button component) is in place, but the main product features (HTML parser, AI route, gabarito display) are not yet implemented. The planned AI layer will use Vercel AI SDK with Google Gemini as the default LLM provider.

## Details

### Languages

**Primary:**
- TypeScript 5.9.3 — all application code under `app/`, `components/`, `lib/`
- CSS — `app/globals.css` for design tokens and Tailwind imports

**Secondary:**
- JavaScript (legacy) — `gabarito.html`, `gabarito.js`, `gabarito.css` in root (original single-file tool, kept for reference)

### Runtime

**Environment:**
- Node.js (version not pinned — no `.nvmrc` or `.node-version` file present)

**Package Manager:**
- pnpm — lockfile version `9.0` (`pnpm-lock.yaml` present and committed)

### Frameworks

**Core:**
- Next.js `16.1.7` — App Router, React Server Components enabled (`"rsc": true` in `components.json`), Turbopack used in dev (`next dev --turbopack`)

**UI Component System:**
- shadcn/ui `4.1.2` (CLI: `shadcn` package) — style `radix-luma`, base color `mist`, icon library `phosphor`
- Radix UI `1.4.3` — primitive component layer underlying shadcn

**Build / Dev:**
- Turbopack — enabled via `next dev --turbopack` (faster HMR during development)
- PostCSS `^8` — config at `postcss.config.mjs`, single plugin: `@tailwindcss/postcss`
- ESLint `9.39.4` — config at `eslint.config.mjs`, extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Prettier `3.8.1` — with `prettier-plugin-tailwindcss` for class sorting

### Key Dependencies

**UI & Styling:**
- `tailwindcss` `^4.2.1` — Tailwind v4 (CSS-first config, no `tailwind.config.js`)
- `@tailwindcss/postcss` `^4.2.1` — PostCSS plugin for Tailwind v4
- `tw-animate-css` `^1.4.0` — animation utilities, imported in `globals.css`
- `next-themes` `^0.4.6` — dark/light/system theme switching; configured in `components/theme-provider.tsx`
- `class-variance-authority` `^0.7.1` — variant-based className management (used by shadcn components)
- `clsx` `^2.1.1` — conditional class composition
- `tailwind-merge` `^3.5.0` — merges Tailwind classes without conflicts; exposed via `lib/utils.ts` as `cn()`
- `@phosphor-icons/react` `^2.1.10` — icon set (configured as `iconLibrary` in `components.json`)

**Planned (per `docs/ARCHITECTURE.md`, not yet installed):**
- `ai` — Vercel AI SDK core
- `@ai-sdk/google` — Google Gemini provider (default)
- `zod` — structured output schema validation for LLM responses

### Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: `ES2017`, strict mode enabled, `moduleResolution: "bundler"`
- Path alias: `@/*` maps to project root (`./`)
- Next.js TypeScript plugin enabled

**Tailwind:**
- v4 CSS-first setup — no `tailwind.config.js`; configuration lives in `app/globals.css` via CSS custom properties (OKLCH color tokens)
- CSS variables used for all design tokens (`--background`, `--primary`, etc.)

**shadcn:**
- Config: `components.json` (schema: `https://ui.shadcn.com/schema.json`)
- Component alias: `@/components/ui`
- Utils alias: `@/lib/utils`

**Build scripts:**
- `pnpm dev` — start dev server with Turbopack
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm format` — Prettier (all `.ts`/`.tsx` files)
- `pnpm typecheck` — `tsc --noEmit`

### Platform Requirements

**Development:**
- pnpm required (lockfile format v9)
- Node.js compatible with Next.js 16 (≥ 18.18 recommended)

**Production:**
- Deployment target: Vercel (implied by Vercel AI SDK choice and Next.js App Router)
- No Dockerfile or other deployment config present

## Gaps / Unknowns

- Node.js version is not pinned (no `.nvmrc`, `.node-version`, or `engines` field in `package.json`)
- Vercel AI SDK (`ai`, `@ai-sdk/google`) and Zod are planned but not yet installed
- No testing framework installed or configured (no Jest, Vitest, Playwright, etc.)
- Deployment platform is assumed to be Vercel based on architecture docs but not confirmed by any config file
- No CI/CD pipeline configuration found
