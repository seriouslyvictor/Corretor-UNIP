import type { ParsedQuestion } from "./schemas";

type Mode = "no-bs" | "verbose";

export function buildPrompt(questions: ParsedQuestion[], mode: Mode): string {
  const modeInstruction =
    mode === "no-bs"
      ? "Return ONLY the correct answer letter for each question. Do NOT include explanations, reasoning, or any additional text."
      : "Return the correct answer letter AND a brief explanation for each question. The explanation should say why the correct answer is right and briefly note why the other options are wrong.";

  const questionsBlock = questions
    .map((q, i) => {
      const opts = q.options.map((o) => `  ${o.letter}) ${o.text}`).join("\n");
      const imgNote = q.imageBase64
        ? "\n  [This question includes an accompanying image]"
        : "";
      return `[Question ${i}]\n${q.text}\n${opts}${imgNote}`;
    })
    .join("\n\n");

  return `You are solving a Brazilian university (UNIP) multiple-choice exam.
${modeInstruction}
There are ${questions.length} questions. For each, return a JSON object with questionIndex (0-based), answer (letter A-E), confidence (high|medium|low)${mode === "verbose" ? ", and explanation (string)" : ""}.

${questionsBlock}`;
}
