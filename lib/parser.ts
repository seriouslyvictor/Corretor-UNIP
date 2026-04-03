import type { ParsedQuestion, ParsedOption } from "@/lib/schemas";

/**
 * Parse a UNIP test review HTML page into structured questions.
 * Extracts question number, text, answer options, and embedded images.
 */
export function parseHTML(rawHTML: string): ParsedQuestion[] {
  if (typeof window === "undefined") {
    throw new Error("parseHTML must be called in a browser environment");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");

  const questionElements = doc.querySelectorAll("li.liItem");
  const questions: ParsedQuestion[] = [];

  questionElements.forEach((el, idx) => {
    // Extract question number
    const numberEl = el.querySelector(".numero");
    const number = numberEl
      ? parseInt(numberEl.textContent?.trim() ?? String(idx + 1), 10)
      : idx + 1;

    // Extract question text (from .vtbegenerated p or fallback)
    const textEl = el.querySelector(".vtbegenerated");
    const text = textEl?.textContent?.trim() ?? "";

    // Extract answer options
    const options: ParsedOption[] = [];
    const optionEls = el.querySelectorAll(".answerNumLabelSpan, .answerTextSpan");
    let currentLetter = "";
    optionEls.forEach((optEl) => {
      if (optEl.classList.contains("answerNumLabelSpan")) {
        currentLetter = optEl.textContent?.trim() ?? "";
      } else if (optEl.classList.contains("answerTextSpan") && currentLetter) {
        options.push({ letter: currentLetter, text: optEl.textContent?.trim() ?? "" });
        currentLetter = "";
      }
    });

    // Extract embedded image as base64
    let imageBase64: string | null = null;
    const imgEl = el.querySelector("img");
    if (imgEl?.src?.startsWith("data:")) {
      // Already base64 embedded
      imageBase64 = imgEl.src.split(",")[1] ?? null;
    }

    questions.push({ number, text, options, imageBase64 });
  });

  return questions;
}
