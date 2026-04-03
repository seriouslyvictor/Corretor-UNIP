import { NextRequest } from "next/server";
import { generateObject } from "ai";
import { solvedAnswerSchema, solveRequestSchema } from "@/lib/schemas";
import { buildSinglePrompt } from "@/lib/prompts";
import { classifyQuestion, modelForTier } from "@/lib/router";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = solveRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { mode, questions } = parsed.data;
  console.log(`[solve] mode=${mode} questions=${questions.length}`);

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType: "image/png" };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for (const [i, question] of questions.entries()) {
        const promptText = buildSinglePrompt(question, i, mode);

        const content: ContentPart[] = [{ type: "text", text: promptText }];
        if (question.imageBase64) {
          content.push({ type: "image", image: question.imageBase64, mimeType: "image/png" });
        }

        console.log(`\n[solve] ── Q${i + 1}/${questions.length} ──────────────────────`);

        const tier = await classifyQuestion(question, i);
        const model = modelForTier(tier);
        console.log(`[solve] tier=${tier} model=${tier === "full" ? "gemini-2.5-flash-preview" : "gemini-2.5-flash-lite-preview"}`);
        console.log(`[solve] prompt:\n${promptText}`);
        if (question.imageBase64) {
          console.log(`[solve] + image attached (${Math.round(question.imageBase64.length * 0.75 / 1024)} KB)`);
        }

        try {
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

          console.log(`[solve] answer: ${JSON.stringify(result.object)}`);
          controller.enqueue(encoder.encode(JSON.stringify(result.object) + "\n"));
        } catch (err) {
          console.error(`[solve] Q${i + 1} failed:`, err);
          // emit a low-confidence placeholder so the client isn't left hanging
          const fallback = { questionIndex: i, answer: "A" as const, confidence: "low" as const };
          controller.enqueue(encoder.encode(JSON.stringify(fallback) + "\n"));
        }
      }

      console.log(`[solve] ── done ──────────────────────────────`);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
