import { NextRequest } from "next/server";
import { solveRequestSchema } from "@/lib/schemas";
import { solveWithFallback } from "@/lib/router";
import type { SolveStatusEvent } from "@/lib/router";

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

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const onStatus = (evt: SolveStatusEvent) => {
        console.log(`[solve] status Q${evt.questionIndex + 1}: ${evt.event} — ${evt.message}`);
        enqueue(evt);
      };

      for (const [i, question] of questions.entries()) {
        console.log(`[solve] ── Q${i + 1}/${questions.length} ──────────────────────`);

        if (!question.text.trim()) {
          console.warn(`[solve] Q${i + 1} has empty question text — skipping`);
          enqueue({
            questionIndex: i,
            answer: "A" as const,
            confidence: "low" as const,
            explanation: `Questão ${i + 1} não pôde ser analisada.`,
          });
          continue;
        }

        try {
          const answer = await solveWithFallback(question, i, mode, onStatus);
          console.log(`[solve] Q${i + 1} answer: ${JSON.stringify(answer)}`);
          enqueue(answer);
        } catch (err) {
          console.error(`[solve] Q${i + 1} failed:`, err);
          enqueue({ questionIndex: i, answer: "A" as const, confidence: "low" as const });
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
