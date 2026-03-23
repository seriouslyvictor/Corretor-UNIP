# Corretor UNIP v2 — Architecture & Implementation Plan

## Overview

Evolve the current static HTML gabarito tool into a Next.js application powered by Vercel AI SDK. The app will parse test pages, send questions (including images) to an LLM for solving, and display results as a gabarito.

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js (App Router) | Full-stack React, API routes for LLM calls, fast UI with shadcn/ui |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/google`) | Provider-agnostic — swap Gemini/Claude/OpenAI by changing one import |
| UI | shadcn/ui + Tailwind CSS | Pre-built components, dark theme, rapid development |
| Default LLM | Google Gemini (via `@ai-sdk/google`) | Strong world knowledge, multimodal (text + images), generous free tier |

## Core Flow

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (Client)                  │
│                                                      │
│  1. User loads saved HTML or pastes source code      │
│  2. Parser extracts questions, options, and images   │
│  3. User selects mode: Verbose or No BS              │
│  4. Sends parsed questions to API route              │
│  5. Receives answers → displays gabarito             │
└──────────────────────┬──────────────────────────────┘
                       │ POST /api/solve
                       ▼
┌─────────────────────────────────────────────────────┐
│                 SERVER (API Route)                    │
│                                                      │
│  1. Receives batch of questions (text + image URLs)  │
│  2. Builds prompts per question based on mode        │
│  3. Calls LLM via Vercel AI SDK                      │
│  4. Uses generateObject() for structured responses   │
│  5. Returns JSON array of answers                    │
└─────────────────────────────────────────────────────┘
```

## Feature Details

### HTML Parser (client-side)

Reuses existing parsing logic. Extracts from each question:
- Question number (`Pergunta N`)
- Question text (from `.vtbegenerated p`)
- All answer options (letter + text from `.answerNumLabelSpan` / `.answerTextSpan`)
- Images (any `<img>` inside the question body — converted to base64 or URL)

### LLM Integration (server-side API route)

**Endpoint:** `POST /api/solve`

**Request body:**
```json
{
  "mode": "verbose" | "nobs",
  "questions": [
    {
      "number": 1,
      "text": "Do ponto de vista da lógica formal...",
      "options": [
        { "letter": "a", "text": "Qual é a sua cor preferida?" },
        { "letter": "b", "text": "Boa noite!" }
      ],
      "images": ["data:image/png;base64,..."]
    }
  ]
}
```

**Structured output schema (per question):**
```json
{
  "number": 1,
  "answer": "e",
  "explanation": "Only present in verbose mode..."
}
```

**Provider swap:** Changing provider is a single-line change:
```js
// Current
import { google } from '@ai-sdk/google';
const model = google('gemini-2.0-flash');

// Swap to Claude
import { anthropic } from '@ai-sdk/anthropic';
const model = anthropic('claude-sonnet-4-20250514');

// Swap to OpenAI
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4o');
```

### Answer Modes

| Mode | Prompt Strategy | Output |
|------|----------------|--------|
| **No BS** | "Answer with ONLY the letter of the correct option." | Just the letter per question |
| **Verbose** | "Answer with the correct letter AND a brief explanation of why it is correct and why the others are wrong." | Letter + explanation |

### Gabarito Display

- Grid layout similar to current design (question number + answer letter)
- Verbose mode: expandable cards showing the explanation below each answer
- Color coding: answers displayed prominently
- Option to toggle between modes after solving

## File Structure

```
corretor-unip/
├── app/
│   ├── layout.tsx          # Root layout with dark theme
│   ├── page.tsx            # Main page — input screen
│   ├── gabarito/
│   │   └── page.tsx        # Results display
│   └── api/
│       └── solve/
│           └── route.ts    # LLM endpoint
├── components/
│   ├── html-input.tsx      # File upload + paste textarea
│   ├── mode-selector.tsx   # Verbose vs No BS toggle
│   ├── gabarito-grid.tsx   # Answer grid display
│   └── question-card.tsx   # Verbose mode expandable card
├── lib/
│   ├── parser.ts           # HTML → structured questions
│   └── schemas.ts          # Zod schemas for LLM output
├── .env.local              # API keys (GOOGLE_GENERATIVE_AI_API_KEY)
└── docs/
    └── ARCHITECTURE.md     # This file
```

## Environment Variables

```env
# Default provider — Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Optional future providers
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
```

## Implementation Order

1. **Scaffold Next.js project** — shadcn/ui init, Tailwind, dark theme
2. **Port HTML parser** — adapt current JS parser to TypeScript, add image extraction
3. **Build input UI** — file upload + paste, mode selector
4. **Create API route** — Vercel AI SDK with Gemini, structured output via Zod
5. **Build gabarito UI** — grid for No BS, expandable cards for Verbose
6. **Testing & polish** — error handling, loading states, edge cases
