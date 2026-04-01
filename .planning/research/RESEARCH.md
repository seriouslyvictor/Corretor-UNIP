# Research: Next.js 15 + Vercel AI SDK + Gemini — Corretor UNIP

**Researched:** 2026-03-31
**Overall confidence:** MEDIUM-HIGH (official docs + verified sources)

---

## 1. generateObject() vs generateText() — Batch Processing Multiple Questions

### Current Status (IMPORTANT)

`generateObject` and `streamObject` are **deprecated in AI SDK 6** (the current stable release as of early 2026). They still function but will be removed in a future version. New code should use `generateText` / `streamText` with the `Output` object instead.

Current stable versions:
- `ai`: **6.0.141** (latest as of 2026-03-27)
- `@ai-sdk/google`: **3.0.54** (latest as of 2026-03-31)
- `@ai-sdk/react`: **3.0.143**

### Recommended Approach: Single Call with Output.array()

For 20–30 questions in one call, use `Output.array()` with a per-question element schema. This is a single LLM call that returns a validated array.

```typescript
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const answerSchema = z.object({
  questionIndex: z.number(),
  answer: z.enum(['A', 'B', 'C', 'D', 'E']),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string().optional(),
});

const { output } = await generateText({
  model: google('gemini-2.5-flash'),
  output: Output.array({ element: answerSchema }),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: buildBatchPrompt(questions) },
        // images go here as additional parts (see section 2)
      ],
    },
  ],
});

// output is AnswerSchema[] — fully typed and validated
```

### One Call vs. One Call Per Question

**Recommended: single batch call.**

- Gemini context window easily fits 20–30 university questions with images.
- One call = lower latency, lower cost, simpler error handling.
- `Output.array()` guarantees a typed array back, not a blob of JSON.
- One-call-per-question is only justified if you need per-question streaming or per-question error isolation.

### Streaming Variant (for progressive UI updates)

If you want to show answers as they arrive rather than waiting for the full batch:

```typescript
import { streamText, Output } from 'ai';

const { elementStream } = streamText({
  model: google('gemini-2.5-flash'),
  output: Output.array({ element: answerSchema }),
  messages: [...],
});

for await (const answer of elementStream) {
  // Each answer is complete and validated before being emitted
  updateGrid(answer);
}
```

`elementStream` emits each completed array element as soon as Gemini finishes it — you do not have to wait for all 30 answers.

**Source:** [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [AI SDK 6 blog post](https://vercel.com/blog/ai-sdk-6)

---

## 2. Gemini Multimodal — Image + Text in a Single Message

### Correct Message Format

Use `type: 'image'` for inline images (base64 buffers from client). The `type: 'file'` variant is for PDFs and videos. For UNIP question images, use `'image'`.

```typescript
messages: [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `Solve the following ${questions.length} university exam questions. Return one answer object per question.`,
      },
      // Insert each question's text inline in the text part above,
      // then append image parts here:
      {
        type: 'image',
        image: Buffer.from(base64String, 'base64'), // or just the base64 string
        mimeType: 'image/png', // or 'image/jpeg'
      },
      // Additional image parts for other questions...
    ],
  },
]
```

### Practical Pattern for Mixed Questions

Some questions have images, others do not. Build the content array dynamically:

```typescript
function buildMessageContent(questions: ParsedQuestion[]) {
  const parts: MessageContent[] = [];

  parts.push({
    type: 'text',
    text: buildSystemPrompt(questions),
  });

  for (const q of questions) {
    if (q.imageBase64) {
      parts.push({
        type: 'image',
        image: q.imageBase64, // base64 string — SDK accepts this directly
        mimeType: q.imageMimeType ?? 'image/png',
      });
    }
  }

  return parts;
}
```

The SDK accepts the `image` field as: base64 string, base64 data URL (`data:image/png;base64,...`), `Uint8Array`, `ArrayBuffer`, or `Buffer`. All are valid.

### Gotcha: mimeType Field Name

The field is `mimeType` for `type: 'image'` parts and `mediaType` for `type: 'file'` parts. These are different. Using the wrong one silently fails or causes a provider error.

```typescript
// CORRECT for images:
{ type: 'image', image: data, mimeType: 'image/png' }

// CORRECT for PDFs/files:
{ type: 'file', data: pdfBuffer, mediaType: 'application/pdf' }
```

**Source:** [AI SDK Providers: Google Generative AI](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai), [Google Gemini Vercel AI SDK Cheatsheet](https://patloeber.com/gemini-ai-sdk-cheatsheet/)

---

## 3. LLM Routing: Flash vs. Flash-Thinking vs. Pro

### Recommended Approach: thinkingBudget Per Request (Single Model)

Rather than routing to different models, use a single model (`gemini-2.5-flash`) and control thinking per request via `thinkingBudget` in `providerOptions`. This is simpler, cheaper, and supported out of the box.

```typescript
// Fast path — fact recall questions (diagrams, definitions)
const { output: fastAnswers } = await generateText({
  model: google('gemini-2.5-flash'),
  output: Output.array({ element: answerSchema }),
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 0,    // disable thinking = fast + cheap
        includeThoughts: false,
      },
    },
  },
  messages: [...],
});

// Reasoning path — calculation, multi-step logic questions
const { output: reasonedAnswers } = await generateText({
  model: google('gemini-2.5-flash'),
  output: Output.array({ element: answerSchema }),
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 8192, // or -1 for dynamic (model decides)
        includeThoughts: false,
      },
    },
  },
  messages: [...],
});
```

`thinkingBudget: -1` enables dynamic thinking where Gemini adjusts budget based on query complexity — a good default if you don't want to pre-classify questions.

### Thinking Token Ranges (Gemini 2.5 Flash)

| Setting | Use case |
|---------|----------|
| `0` | Disable — pure recall, factual lookup |
| `128–2048` | Light reasoning — interpretation, inference |
| `2048–8192` | Moderate — multi-step problems |
| `8192–24576` | Max — complex math, logic proofs |
| `-1` | Dynamic — model decides |

### Gemini 3 Models (Newer)

Gemini 3.x series uses `thinkingLevel: 'low' | 'medium' | 'high'` instead of `thinkingBudget`. If you use Gemini 3 Flash or Pro, the parameter name changes. Check the model ID before shipping.

### Multi-Model Routing (Alternative)

If you want true model routing (e.g., Flash for batch, Pro for hard questions), use the classifier pattern: run a cheap Flash-Lite call first to classify each question's difficulty, then route the batch. The open-source Gemini CLI does this. For UNIP's 20–30 questions this adds latency with marginal benefit — `thinkingBudget: -1` is the pragmatic default.

**Source:** [AI SDK Providers: Google (thinkingConfig)](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai), [Gemini thinking docs](https://ai.google.dev/gemini-api/docs/thinking), [Dynamic Model Usage template](https://vercel.com/templates/next.js/ai-sdk-feature-flags-edge-config)

---

## 4. Next.js 15 App Router — API Route Gotchas

### generateObject / generateText in Route Handlers

`generateText` with `Output` returns a plain object — not a stream. The route handler is straightforward:

```typescript
// app/api/solve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const { questions } = await req.json();

  const { output } = await generateText({
    model: google('gemini-2.5-flash'),
    output: Output.array({ element: answerSchema }),
    messages: buildMessages(questions),
  });

  return NextResponse.json({ answers: output });
}
```

No special streaming setup needed for a non-streaming batch solve.

### Gotcha 1: Body Size with Base64 Images

When the client sends 20–30 questions each with a base64 image, the request body can exceed Next.js defaults. Default middleware body buffer limit is **10MB**. A single 500KB image at base64 is ~670KB; 30 images = ~20MB.

Options:
- Resize/compress images client-side before encoding (recommended — UNIP HTML images are typically small diagrams).
- If needed, configure in `next.config.ts`:
  ```typescript
  experimental: {
    serverActions: { bodySizeLimit: '20mb' }
  }
  ```
  Note: this is for Server Actions. For Route Handlers, the limit is on the Vercel platform side (typically 4.5MB on Hobby, no limit on Pro with edge functions excluded).

**Recommendation:** Strip and compress images client-side to < 150KB each before including in the POST body.

### Gotcha 2: Vercel Function Timeout

Default Vercel serverless function timeout is **10s** on Hobby, **300s** on Pro. Processing 30 questions through Gemini with thinking enabled could take 15–30s depending on complexity. If on Hobby plan:

```typescript
// app/api/solve/route.ts
export const maxDuration = 60; // seconds — requires Pro plan
```

Alternatively, use streaming (`streamText` + `elementStream`) so you can return partial results progressively within the timeout.

### Gotcha 3: GET handlers are dynamic by default in Next.js 15

This doesn't apply to your POST route, but worth noting: GET handlers no longer cache by default in Next.js 15. You need `export const dynamic = 'force-static'` to opt in to caching.

### Gotcha 4: Params Must Be Awaited

If your route has dynamic segments (e.g., `/api/solve/[id]`), params is now a Promise in Next.js 15:
```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // must await
}
```

**Source:** [Next.js 15 Route Handlers docs](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware), [Next.js body size issues](https://github.com/vercel/next.js/issues/57501)

---

## 5. Package Versions

### Recommended Install

```bash
npm install ai@^6.0.0 @ai-sdk/google@^3.0.0 zod@^4.1.8
```

### Version Matrix

| Package | Current Stable | Notes |
|---------|---------------|-------|
| `ai` | 6.0.141 | Use `generateText` + `Output` — `generateObject` deprecated |
| `@ai-sdk/google` | 3.0.54 | Requires `ai` v6 |
| `zod` | 4.x (4.1.8+) | Zod 4 published as `zod/v4` subpath; v3 still on main export |

### Zod 3 vs Zod 4

The AI SDK team recommends Zod **4.1.8 or later** for AI SDK 5+. Zod 4 is stable and fixes TypeScript performance issues (double-loading module declarations). However:

- Zod 4 is published at the `zod/v4` subpath, not as a separate package version on npm (yet).
- If you `import { z } from 'zod'`, you get Zod 3 behavior unless you configure paths.
- The safe path: install `zod@^3.23.8` which is widely compatible, then migrate to `zod/v4` in a follow-up phase once the ecosystem settles.

**Safe default for this project:**
```bash
npm install zod@^3.23.8
```

Use `zod@^4.1.8` (importing from `zod/v4`) only if you need the TypeScript performance fix for large schemas.

**Source:** [ai npm package](https://www.npmjs.com/package/ai), [@ai-sdk/google npm](https://www.npmjs.com/package/@ai-sdk/google), [Zod versioning docs](https://zod.dev/v4/versioning), [AI SDK Zod troubleshooting](https://ai-sdk.dev/docs/troubleshooting/typescript-performance-zod)

---

## Summary: Recommended Implementation Pattern

```typescript
// app/api/solve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const answerSchema = z.object({
  questionIndex: z.number().describe('0-based index matching input order'),
  answer: z.enum(['A', 'B', 'C', 'D', 'E']),
  confidence: z.enum(['high', 'medium', 'low']),
});

export async function POST(req: NextRequest) {
  const { questions } = await req.json(); // ParsedQuestion[]

  const content: MessageContent[] = [
    { type: 'text', text: buildSystemPrompt(questions) },
    ...questions
      .filter((q) => q.imageBase64)
      .map((q) => ({
        type: 'image' as const,
        image: q.imageBase64,
        mimeType: (q.imageMimeType ?? 'image/png') as 'image/png' | 'image/jpeg',
      })),
  ];

  const { output } = await generateText({
    model: google('gemini-2.5-flash'),
    output: Output.array({ element: answerSchema }),
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: -1 }, // dynamic thinking
      },
    },
    messages: [{ role: 'user', content }],
  });

  return NextResponse.json({ answers: output });
}
```

---

## Open Questions / Flags for Later Phases

1. **Image positioning context** — Gemini receives images in a flat array separate from question text. If multiple questions each have an image, the model must infer which image maps to which question from the prompt text. Worth testing whether inline image references in the prompt text (`[Image for Q3]`) improve accuracy.

2. **Structured output reliability with 30 items** — Gemini structured output (JSON mode) is generally reliable, but with 30 items and complex schemas there is a small chance of `NoOutputGeneratedError`. Add retry logic with exponential backoff. `Output.array()` validates each element — catch `AI_NoOutputGeneratedError` and retry.

3. **UNIP image types** — If UNIP embeds images as CSS background-image rather than `<img>` tags, the client-side parser needs to handle that separately. Affects what base64 data arrives at the API.

4. **Vercel plan limits** — If deploying on Hobby, the 10s timeout makes streaming mandatory for large batches. Validate plan before choosing streaming vs. non-streaming architecture.

5. **Zod 4 ecosystem readiness** — Some libraries (tRPC, etc.) may still expect Zod 3. If the project adds any such libraries, using Zod 3 on the main export is safer for now.
