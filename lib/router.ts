import { generateObject, APICallError } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { ParsedQuestion, SolvedAnswer } from "./schemas";
import { solvedAnswerSchema } from "./schemas";
import { buildSinglePrompt } from "./prompts";

const MODELS = {
  // Used for complex/medium questions that benefit from stronger reasoning
  full: "gemini-3-flash-preview",
  // Used for straightforward recall/definition questions — faster and cheaper
  lite: "gemini-3.1-flash-lite-preview",
} as const;

export type ModelTier = keyof typeof MODELS;

// --- Status events streamed back to client during rate limiting ---

export type SolveStatusEvent = {
  __type: "status";
  event: "rate_limited" | "fallback_used";
  questionIndex: number;
  message: string;
};

export type OnStatus = (evt: SolveStatusEvent) => void;

// --- Startup model validation (called from instrumentation.ts) ---

export async function validateModels(): Promise<void> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn("[router] GOOGLE_GENERATIVE_AI_API_KEY not set — skipping model validation");
    return;
  }

  let data: { models: { name: string }[] };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (!res.ok) {
      console.warn(`[router] Model list fetch returned ${res.status} — skipping validation`);
      return;
    }
    data = await res.json();
  } catch (err) {
    console.warn("[router] Model list fetch failed (network?) — skipping validation:", err);
    return;
  }

  const available = new Set(data.models.map((m) => m.name.replace("models/", "")));
  const missing = Object.entries(MODELS).filter(([, name]) => !available.has(name));

  if (missing.length > 0) {
    throw new Error(
      `[router] Gemini models not available for this API key: ${missing.map(([tier, name]) => `${tier}="${name}"`).join(", ")}. Update MODELS in lib/router.ts.`,
    );
  }

  console.log(`[router] Model validation passed: ${Object.values(MODELS).join(", ")}`);
}

// --- Complexity classifier ---

const complexitySchema = z.object({
  reasoning: z.string().describe("Brief step-by-step explanation for the tier choice"),
  tier: z.enum(["full", "lite"]),
});

const CLASSIFIER_SYSTEM_PROMPT = `You are a question complexity classifier for a Brazilian university (UNIP) multiple-choice exam solver.
Classify each question into one of two tiers:

- "lite": Simple, factual, or definition-based questions. Direct recall with no ambiguity. (Est. 1 reasoning step)
- "full": Questions requiring multi-step reasoning, formula application, interpretation, comparison, or image analysis.

Be conservative: when in doubt, choose "full".`;

async function classifyQuestion(question: ParsedQuestion, index: number): Promise<ModelTier> {
  const opts = question.options.map((o) => `${o.letter}) ${o.text}`).join("\n");
  const imgNote = question.imageBase64 ? "\n[Question includes an image]" : "";
  const input = `Question ${index + 1}:\n${question.text}\n${opts}${imgNote}`;

  const result = await generateObject({
    model: google(MODELS.lite),
    schema: complexitySchema,
    system: CLASSIFIER_SYSTEM_PROMPT,
    prompt: input,
  });

  return result.object.tier;
}

// --- Overload detection (429 rate limit + 503 model unavailable) ---

// Covers both direct APICallError and AI SDK's AI_RetryError wrapper
// (AI_RetryError is thrown when the SDK exhausts its internal retries; the real
// status code lives in .lastError, not on the wrapper itself)
const OVERLOAD_CODES = new Set([429, 503]);

function isOverloaded(err: unknown): boolean {
  if (APICallError.isInstance(err)) {
    return OVERLOAD_CODES.has(err.statusCode ?? 0);
  }
  // AI_RetryError wraps the last APICallError — unwrap one level
  if (err instanceof Error) {
    const last = (err as { lastError?: unknown }).lastError;
    if (APICallError.isInstance(last)) {
      return OVERLOAD_CODES.has(last.statusCode ?? 0);
    }
  }
  return false;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// --- Core single solve attempt ---

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string };

async function solveOnce(
  model: ReturnType<typeof google>,
  question: ParsedQuestion,
  index: number,
  mode: string,
): Promise<SolvedAnswer> {
  const promptText = buildSinglePrompt(question, index, mode as "no-bs" | "verbose");
  const content: ContentPart[] = [{ type: "text", text: promptText }];
  if (question.imageBase64) {
    if (question.imageBase64.startsWith("data:")) {
      content.push({ type: "image", image: question.imageBase64 });
    } else {
      content.push({ type: "image", image: question.imageBase64, mimeType: "image/png" });
    }
  }

  const result = await generateObject({
    model,
    schema: solvedAnswerSchema,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: mode === "no-bs" ? 1024 : -1,
          includeThoughts: false,
        },
      },
    },
    messages: [{ role: "user", content }],
  });

  return { ...result.object, questionIndex: index };
}

// --- Retry with exponential backoff (lite model) ---

async function solveWithRetry(
  question: ParsedQuestion,
  index: number,
  mode: string,
  onStatus?: OnStatus,
  maxRetries = 3,
): Promise<SolvedAnswer> {
  const model = google(MODELS.lite);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await solveOnce(model, question, index, mode);
    } catch (err) {
      if (!isOverloaded(err) || attempt === maxRetries) throw err;
      const delay = Math.min(2000 * 2 ** (attempt - 1), 16000); // 2s → 4s → 8s → cap 16s
      onStatus?.({
        __type: "status",
        event: "rate_limited",
        questionIndex: index,
        message: `Limite atingido. Aguardando ${delay / 1000}s...`,
      });
      await sleep(delay);
    }
  }
  throw new Error("Max retries exceeded");
}

// --- Main entry point used by /api/solve ---

export async function solveWithFallback(
  question: ParsedQuestion,
  index: number,
  mode: string,
  onStatus?: OnStatus,
): Promise<SolvedAnswer> {
  const tier = await classifyQuestion(question, index);
  console.log(`[router] Q${index + 1} tier=${tier} model=${MODELS[tier]}`);

  if (tier === "lite") {
    return solveWithRetry(question, index, mode, onStatus);
  }

  // tier === "full": try full model, fall back to lite on 429
  try {
    return await solveOnce(google(MODELS.full), question, index, mode);
  } catch (err) {
    if (!isOverloaded(err)) throw err;
    onStatus?.({
      __type: "status",
      event: "fallback_used",
      questionIndex: index,
      message: "Modelo avançado indisponível (limite atingido). Usando modelo alternativo...",
    });
    console.warn(`[router] Q${index + 1} full model 429 — falling back to lite`);
    return solveWithRetry(question, index, mode, onStatus);
  }
}
