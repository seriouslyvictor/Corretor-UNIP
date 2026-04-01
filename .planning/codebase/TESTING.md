# Testing Patterns

_Last updated: 2026-03-31_

## Summary

This project has no testing infrastructure configured. There is no test framework installed, no test scripts in `package.json`, no test configuration files, and no test files anywhere in the source tree. The codebase is at scaffold stage (Next.js + shadcn bootstrap only). Testing is a gap that must be established from scratch before feature work begins.

---

## Details

### Test Framework

**Status: Not installed.**

No test runner is present in `package.json` dependencies or devDependencies. The following were checked and are absent:

- Jest / `jest.config.*`
- Vitest / `vitest.config.*`
- Playwright / `playwright.config.*`
- Cypress
- Testing Library (`@testing-library/react`, `@testing-library/user-event`)

### Test Scripts

**Status: None.**

`package.json` scripts:
```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "format": "prettier --write \"**/*.{ts,tsx}\"",
  "typecheck": "tsc --noEmit"
}
```

No `test`, `test:watch`, or `coverage` scripts exist.

### Test Files

**Status: None in project source.**

No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files exist outside of `node_modules/`.

### Coverage

**Status: Not configured.**

`coverage/` is listed in `.prettierignore`, which indicates awareness of a future coverage output directory, but no tooling generates it yet.

### CI

**Status: Not detected.**

No `.github/workflows/`, `Jenkinsfile`, or other CI configuration exists in the repository.

---

## Gaps / Unknowns

- **No testing decision has been made.** The tech stack (Next.js 16 + React 19 + TypeScript strict) is compatible with both Vitest and Jest — Vitest is the more common choice for Next.js App Router projects due to ESM-native support and Turbopack alignment.
- **No E2E framework chosen.** Playwright is the standard recommendation for Next.js, but nothing is configured.
- **No component testing approach.** Given the shadcn/radix-ui component model, `@testing-library/react` with Vitest or Jest is the natural pairing.
- **Recommended setup when testing is introduced:**
  - Unit/component: Vitest + `@testing-library/react` + `@testing-library/user-event`
  - E2E: Playwright
  - Config file: `vitest.config.ts` at project root
  - Test location: co-located `*.test.tsx` files next to source, or a top-level `__tests__/` directory
  - Add `"test": "vitest"`, `"test:ui": "vitest --ui"`, `"coverage": "vitest run --coverage"` scripts to `package.json`
