# Coding Conventions

_Last updated: 2026-03-31_

## Summary

This is an early-stage Next.js 16 / React 19 project scaffolded with shadcn/ui (radix-luma style). Conventions are primarily enforced through Prettier (with Tailwind class sorting) and ESLint (Next.js core-web-vitals + TypeScript rules). TypeScript strict mode is enabled. The codebase is small — only scaffold files exist — so conventions are inferred from tooling config and the handful of component files present.

---

## Details

### Formatting (Prettier)

Config: `.prettierrc`

| Setting | Value |
|---|---|
| `semi` | `false` — no semicolons |
| `singleQuote` | `false` — use double quotes |
| `tabWidth` | `2` spaces |
| `trailingComma` | `"es5"` — trailing commas where valid in ES5 |
| `printWidth` | `80` characters |
| `endOfLine` | `lf` |
| Plugin | `prettier-plugin-tailwindcss` — auto-sorts Tailwind classes |
| Tailwind stylesheet | `app/globals.css` |
| Tailwind utility fns | `cn`, `cva` — both get class sorting applied |

**Run formatter:**
```bash
pnpm format   # prettier --write "**/*.{ts,tsx}"
```

**Ignored paths** (`.prettierignore`): `dist/`, `node_modules/`, `.next/`, `.turbo/`, `coverage/`, `pnpm-lock.yaml`, `.pnpm-store/`

### Linting (ESLint)

Config: `eslint.config.mjs`

- Uses flat config API (`defineConfig` from `eslint/config`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rules beyond the Next.js recommended sets
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**Run linter:**
```bash
pnpm lint   # eslint
```

### TypeScript

Config: `tsconfig.json`

| Flag | Value | Implication |
|---|---|---|
| `strict` | `true` | All strict checks enabled (noImplicitAny, strictNullChecks, etc.) |
| `noEmit` | `true` | Type-check only; Next.js handles compilation |
| `isolatedModules` | `true` | Each file must be independently compilable |
| `allowJs` | `true` | JS files accepted alongside TS |
| `skipLibCheck` | `true` | Skips checking `.d.ts` in node_modules |
| `target` | `ES2017` | |
| `module` | `esnext` | |
| `moduleResolution` | `bundler` | Turbopack-compatible resolution |
| `resolveJsonModule` | `true` | |
| `jsx` | `react-jsx` | No need for React import in JSX files |
| `incremental` | `true` | Build cache enabled |

**Path alias:** `@/*` maps to `./*` (project root). Use `@/components/...`, `@/lib/...`, `@/hooks/...` for all imports.

**Run type check:**
```bash
pnpm typecheck   # tsc --noEmit
```

### Naming Conventions

Observed from existing files:

**Files:**
- React components: `PascalCase.tsx` — e.g., `theme-provider.tsx` is an exception (kebab-case), but contains `ThemeProvider` as the export name. Shadcn-generated files use kebab-case filenames by convention (`button.tsx`, `theme-provider.tsx`).
- Utility files: `camelCase.ts` or kebab-case — e.g., `utils.ts`
- Pages/layouts (Next.js App Router): `page.tsx`, `layout.tsx` (lowercase, Next.js convention)

**Functions and components:**
- React components: `PascalCase` function declarations — e.g., `function Button(...)`, `function ThemeProvider(...)`
- Utility functions: `camelCase` — e.g., `cn()`
- Internal helper functions: `camelCase` — e.g., `isTypingTarget()`, `onKeyDown()`

**Variables:**
- `camelCase` — e.g., `fontMono`, `oxaniumHeading`, `resolvedTheme`
- CSS variable refs: `--kebab-case` (CSS custom properties in `globals.css`)

**Types/Interfaces:**
- `PascalCase` — inferred from TypeScript strict mode and React type usage

**Exports:**
- Named exports preferred: `export { Button, buttonVariants }` at file bottom
- Default exports for pages and layouts: `export default function Page()`
- Avoid barrel `index.ts` files (no evidence of them)

### Component Patterns

Source: `components/ui/button.tsx`, `components/theme-provider.tsx`

- Use `cva` (class-variance-authority) for variant-based component styling
- Pass `cn()` from `@/lib/utils` for class merging
- Use `React.ComponentProps<"element">` for prop spreading instead of manually typing HTML attributes
- Use `data-slot`, `data-variant`, `data-size` attributes on root elements for scoped CSS targeting
- `asChild` pattern via `Slot.Root` from `radix-ui` for polymorphic components
- `"use client"` directive at top of client-only files (e.g., `theme-provider.tsx`)
- Server Components are the default (no directive needed)

### Import Style

- Double quotes for all strings (Prettier `singleQuote: false`)
- No semicolons at line ends
- Path aliases (`@/`) for all internal imports
- External imports come first, then internal (`@/`) imports — observed in `layout.tsx` and `button.tsx`

### Styling

- Tailwind CSS v4 via `@import "tailwindcss"` — utility-first
- CSS variables defined in `app/globals.css` using `oklch()` color space
- `tw-animate-css` for animations
- `shadcn/tailwind.css` for shadcn token layer
- `@theme inline` block maps CSS variables to Tailwind tokens
- Base layer uses `@apply` for global resets

---

## Gaps / Unknowns

- No custom ESLint rules beyond Next.js defaults — unclear if stricter rules will be added as the project grows
- `allowJs: true` in tsconfig suggests JS files may be accepted, but no `.js` source files exist yet (only legacy `gabarito.js` in root)
- No `import/order` rule configured — import grouping is convention-only, not enforced
- No Husky or lint-staged for pre-commit hooks — formatting/linting must be run manually
- `layout.tsx` has some inconsistently formatted font config (no spaces around object properties in inline calls) — Prettier has not been run on it yet
- kebab-case vs PascalCase for filenames is ambiguous: shadcn generates kebab-case, but the project may diverge
