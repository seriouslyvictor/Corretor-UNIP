import { z } from "zod";

// Parsed question from the HTML parser
export const ParsedOptionSchema = z.object({
  letter: z.string(),
  text: z.string(),
});

export const ParsedQuestionSchema = z.object({
  number: z.number(),
  text: z.string(),
  options: z.array(ParsedOptionSchema),
  imageBase64: z.string().nullable(),
});

export type ParsedOption = z.infer<typeof ParsedOptionSchema>;
export type ParsedQuestion = z.infer<typeof ParsedQuestionSchema>;

// Solved answer returned by /api/solve (streamed as NDJSON)
export const SolvedAnswerSchema = z.object({
  questionIndex: z.number(),
  answer: z.string().regex(/^[A-E]$/),
  explanation: z.string().optional(),
});

export type SolvedAnswer = z.infer<typeof SolvedAnswerSchema>;
