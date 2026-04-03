import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import type { ParsedQuestion } from "./schemas";

// TODO: Two hardening steps before this is production-ready:
//
// 1. Validate model existence on startup.
//    Use the Google AI list-models endpoint (GET /v1beta/models) to confirm that
//    MODELS.full and MODELS.lite are actually available under the current API key
//    before serving any requests. Preview models get deprecated without much notice,
//    so a startup check with a clear error is better than silent failures at runtime.
//
// 2. Enforce rate limits dynamically.
//    Both models are preview/experimental and have strict RPM/TPM quotas.
//    Plan: on app init, fetch current quota state from the Google AI quota API (or
//    track usage in-process), then gate each generateObject call with a token-bucket
//    or leaky-bucket per model. If the chosen model is at its limit, either wait or
//    fall back to the other tier rather than letting the request error.

const MODELS = {
  // Used for complex/medium questions that benefit from stronger reasoning
  full: "gemini-3-flash-preview",
  // Used for straightforward recall/definition questions — faster and cheaper
  lite: "gemini-3.1-flash-lite-preview",
} as const;

export type ModelTier = keyof typeof MODELS;

const complexitySchema = z.object({
  reasoning: z.string().describe("Brief step-by-step explanation for the tier choice"),
  tier: z.enum(["full", "lite"]),
});

const CLASSIFIER_SYSTEM_PROMPT = `You are a question complexity classifier for a Brazilian university (UNIP) multiple-choice exam solver.
Classify each question into one of two tiers:

- "lite": Simple, factual, or definition-based questions. Direct recall with no ambiguity. (Est. 1 reasoning step)
- "full": Questions requiring multi-step reasoning, formula application, interpretation, comparison, or image analysis.

Be conservative: when in doubt, choose "full".`;

export async function classifyQuestion(question: ParsedQuestion, index: number): Promise<ModelTier> {
  const opts = question.options.map((o) => `${o.letter}) ${o.text}`).join("\n");
  const imgNote = question.imageBase64 ? "\n[Question includes an image]" : "";

  const input = `Question ${index + 1}:\n${question.text}\n${opts}${imgNote}`;

  const result = await generateObject({
    model: google("gemini-3.1-flash-lite-preview"),
    schema: complexitySchema,
    system: CLASSIFIER_SYSTEM_PROMPT,
    prompt: input,
  });

  return result.object.tier;
}

export function modelForTier(tier: ModelTier) {
  return google(MODELS[tier]);
}
