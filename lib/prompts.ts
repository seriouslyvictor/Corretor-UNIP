import type { ParsedQuestion } from "./schemas";

type Mode = "no-bs" | "verbose";

export function buildSinglePrompt(question: ParsedQuestion, index: number, mode: Mode): string {
  const modeInstruction =
    mode === "no-bs"
      ? "Return ONLY the correct answer letter. Do NOT include explanations or reasoning."
      : "Return the correct answer letter AND a brief explanation. Say why the correct answer is right and briefly note why the other options are wrong.";

  const opts = question.options.map((o) => `  ${o.letter}) ${o.text}`).join("\n");
  const imgNote = question.imageBase64
    ? "\n[This question includes an accompanying image above.]"
    : "";

  return `You are solving a Brazilian university (UNIP) multiple-choice exam question.
${modeInstruction}
Return a JSON object with: questionIndex (${index}, 0-based), answer (letter A-E), confidence (high|medium|low)${mode === "verbose" ? ", explanation (string)" : ""}.

Question ${index + 1}:
${question.text}
${opts}${imgNote}`;
}
