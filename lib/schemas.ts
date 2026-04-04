import { z } from "zod";

export const parsedOptionSchema = z.object({
  letter: z.string().min(1), // "A", "B", "C", "D", "E"
  text: z.string(), // option text content
});

export const parsedQuestionSchema = z.object({
  number: z.number().int().positive(),
  text: z.string(), // question body text — empty strings are handled per-question in the API route
  options: z.array(parsedOptionSchema), // answer choices
  imageBase64: z.string().nullable(), // base64 PNG if question has image, null otherwise
});

export const solveRequestSchema = z.object({
  mode: z.enum(["no-bs", "verbose"]),
  questions: z.array(parsedQuestionSchema).min(1),
});

export const solvedAnswerSchema = z.object({
  questionIndex: z
    .number()
    .int()
    .min(0)
    .describe("0-based index matching input order"),
  answer: z.enum(["A", "B", "C", "D", "E"]),
  confidence: z.enum(["high", "medium", "low"]),
  explanation: z.string().optional(),
});

export const solvedAnswersSchema = z.array(solvedAnswerSchema);

export const solveErrorSchema = z.object({
  questionIndex: z.number().int().min(0),
  __error: z.literal(true),
  message: z.string(),
});

export type ParsedOption = z.infer<typeof parsedOptionSchema>;
export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>;
export type SolveRequest = z.infer<typeof solveRequestSchema>;
export type SolvedAnswer = z.infer<typeof solvedAnswerSchema>;
export type SolveError = z.infer<typeof solveErrorSchema>;
