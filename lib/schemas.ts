import { z } from "zod";

// ---- Option ----
export const ParsedOptionSchema = z.object({
  letter: z.string(),
  text: z.string(),
});
export type ParsedOption = z.infer<typeof ParsedOptionSchema>;

// ---- Question ----
export const ParsedQuestionSchema = z.object({
  number: z.number(),
  text: z.string(),
  options: z.array(ParsedOptionSchema),
  imageBase64: z.string().nullable(),
});
export type ParsedQuestion = z.infer<typeof ParsedQuestionSchema>;

// ---- Solve request ----
export const SolveRequestSchema = z.object({
  mode: z.enum(["nobs", "verbose"]),
  questions: z.array(ParsedQuestionSchema),
});
export type SolveRequest = z.infer<typeof SolveRequestSchema>;

// ---- Solve answer ----
export const SolvedAnswerSchema = z.object({
  number: z.number(),
  answer: z.string(),
  explanation: z.string().optional(),
});
export type SolvedAnswer = z.infer<typeof SolvedAnswerSchema>;

// ---- Solve response ----
export const SolveResponseSchema = z.array(SolvedAnswerSchema);
export type SolveResponse = z.infer<typeof SolveResponseSchema>;
