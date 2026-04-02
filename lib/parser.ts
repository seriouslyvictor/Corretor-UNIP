import type { ParsedQuestion, ParsedOption } from "./schemas";

export function parseHTML(rawHTML: string): ParsedQuestion[] {
  if (!rawHTML.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");

  const items = doc.querySelectorAll("li.liItem");
  if (items.length === 0) return [];

  const questions: ParsedQuestion[] = [];

  items.forEach((item) => {
    const h3 = item.querySelector("h3");
    if (!h3) return;

    const numMatch = h3.textContent?.match(/Pergunta\s+(\d+)/i);
    if (!numMatch) return;
    const number = parseInt(numMatch[1], 10);

    // Extract question text from .vtbegenerated p elements
    const textParagraphs = item.querySelectorAll(".vtbegenerated p");
    const text = Array.from(textParagraphs)
      .map((p) => p.textContent?.trim() ?? "")
      .filter(Boolean)
      .join("\n");

    // Extract options from answer divs
    const answerDivs = item.querySelectorAll(".reviewQuestionsAnswerDiv");
    const options: ParsedOption[] = [];
    const seenLetters = new Set<string>();

    answerDivs.forEach((div) => {
      const letterEl = div.querySelector(".answerNumLabelSpan");
      const textEl = div.querySelector(".answerTextSpan");
      if (!letterEl || !textEl) return;

      const letter = (letterEl.textContent?.trim() ?? "").replace(/\.$/, "");
      if (!letter || seenLetters.has(letter)) return;
      seenLetters.add(letter);

      options.push({
        letter,
        text: textEl.textContent?.trim() ?? "",
      });
    });

    // Extract embedded image as base64
    // Look for img tags in the question body (.vtbegenerated)
    const questionBody = item.querySelector(".vtbegenerated");
    let imageBase64: string | null = null;

    if (questionBody) {
      const img = questionBody.querySelector("img");
      if (img) {
        const src = img.getAttribute("src") ?? "";
        // UNIP embeds images as data URIs (data:image/png;base64,...) or relative URLs
        if (src.startsWith("data:")) {
          // Extract the base64 part after the comma
          const commaIndex = src.indexOf(",");
          imageBase64 = commaIndex !== -1 ? src.slice(commaIndex + 1) : null;
        } else if (src) {
          // For non-data-URI images, store the src as-is
          imageBase64 = src;
        }
      }
    }

    questions.push({ number, text, options, imageBase64 });
  });

  questions.sort((a, b) => a.number - b.number);
  return questions;
}
