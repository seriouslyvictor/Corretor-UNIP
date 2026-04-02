import { z } from "zod";

export const parsedOptionSchema = z.object({
  letter: z.string().min(1),       // "A", "B", "C", "D", "E"
  text: z.string(),                // option text content
});

export const parsedQuestionSchema = z.object({
  number: z.number().int().positive(),
  text: z.string(),                          // question body text
  options: z.array(parsedOptionSchema),      // answer choices
  imageBase64: z.string().nullable(),        // base64 PNG if question has image, null otherwise
});

export const solveRequestSchema = z.object({
  mode: z.enum(["no-bs", "verbose"]),
  questions: z.array(parsedQuestionSchema).min(1),
});

export type ParsedOption = z.infer<typeof parsedOptionSchema>;
export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>;
export type SolveRequest = z.infer<typeof solveRequestSchema>;
