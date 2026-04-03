import { NextRequest } from "next/server";
import { streamText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { solvedAnswerSchema, solveRequestSchema } from "@/lib/schemas";
import { buildPrompt } from "@/lib/prompts";

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

  const promptText = buildPrompt(questions, mode);

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType: "image/png" };

  const textPart: ContentPart = {
    type: "text",
    text: promptText,
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
          thinkingBudget: mode === "no-bs" ? 0 : -1,
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
