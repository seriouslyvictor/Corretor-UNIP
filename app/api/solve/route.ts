import { NextRequest } from "next/server";
import { streamText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { solvedAnswerSchema, solveRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = solveRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: parsed.error.flatten(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { mode, questions } = parsed.data;
  const isVerbose = mode === "verbose";

  const questionBlocks = questions
    .map(
      (q, i) =>
        `Question ${i + 1} (index ${i}): ${q.text}\n` +
        q.options.map((o) => `  ${o.letter}: ${o.text}`).join("\n"),
    )
    .join("\n\n");

  const systemInstruction = isVerbose
    ? "You are a Brazilian university exam expert. For each question, return the correct answer letter and a brief explanation of why it is correct."
    : "You are a Brazilian university exam expert. For each question, return only the correct answer letter. Do not include explanations.";

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType: "image/png" };

  const textPart: ContentPart = {
    type: "text",
    text: `${systemInstruction}\n\nSolve the following ${questions.length} exam questions and return one answer object per question:\n\n${questionBlocks}`,
  };

  const imageParts: ContentPart[] = questions
    .filter((q) => q.imageBase64 !== null)
    .map((q) => ({
      type: "image" as const,
      image: q.imageBase64 as string,
      mimeType: "image/png" as const,
    }));

  const content: ContentPart[] = [textPart, ...imageParts];

  const result = streamText({
    model: google("gemini-2.5-flash"),
    output: Output.array({ element: solvedAnswerSchema }),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: -1,
          includeThoughts: false,
        },
      },
    },
    messages: [{ role: "user", content }],
  });

  // Stream individual answer objects as newline-delimited JSON
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const answer of result.elementStream) {
          controller.enqueue(encoder.encode(JSON.stringify(answer) + "\n"));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
