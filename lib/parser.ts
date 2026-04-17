import type { ParsedQuestion, ParsedOption } from "./schemas";

export function parseHTML(rawHTML: string): ParsedQuestion[] {
  if (!rawHTML.trim()) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");

  // UNIP take-test page: each question is a div.takeQuestionDiv
  const items = doc.querySelectorAll("div.takeQuestionDiv");
  if (items.length === 0) return [];

  const questions: ParsedQuestion[] = [];

  items.forEach((item) => {
    // Question number from h3.steptitle: "Pergunta N"
    const h3 = item.querySelector("h3.steptitle");
    if (!h3) return;

    const numMatch = h3.textContent?.match(/Pergunta\s+(\d+)/i);
    if (!numMatch) return;
    const number = parseInt(numMatch[1], 10);

    // Question text from legend > .vtbegenerated p
    // Some questions use <p> wrappers; others place text directly in .vtbegenerated.
    const legend = item.querySelector("legend.legend-visible");
    let text = "";
    if (legend) {
      const textParagraphs = legend.querySelectorAll(".vtbegenerated p");
      if (textParagraphs.length > 0) {
        text = Array.from(textParagraphs)
          .map((p) => p.textContent?.trim() ?? "")
          .filter(Boolean)
          .join("\n");
      } else {
        // Fallback: text is a direct text node inside .vtbegenerated (no <p> wrapper)
        const vtbe = legend.querySelector(".vtbegenerated");
        text = vtbe?.textContent?.trim() ?? "";
      }
    }

    // Options from table.multiple-choice-table rows
    const rows = item.querySelectorAll("table.multiple-choice-table tr");
    const options: ParsedOption[] = [];

    rows.forEach((row) => {
      const letterEl = row.querySelector("td.multiple-choice-numbering");
      if (!letterEl) return;

      const letter = (letterEl.textContent?.trim() ?? "")
        .replace(/\.$/, "")
        .toUpperCase();
      if (!letter) return;

      // Option text may be in a <p> inside .vtbegenerated, or directly in .vtbegenerated
      const vtbeEl = row.querySelector("td:last-child .vtbegenerated");
      if (!vtbeEl) return;

      const pEl = vtbeEl.querySelector("p");
      const optionText = (pEl ?? vtbeEl).textContent?.trim() ?? "";
      if (!optionText) return;

      options.push({
        letter,
        text: optionText,
      });
    });

    // Image: look in the legend body (question stem) for data URI images
    let imageBase64: string | null = null;
    if (legend) {
      const img = legend.querySelector("img");
      if (img) {
        const src = img.getAttribute("src") ?? "";
        if (src.startsWith("data:")) {
          const commaIndex = src.indexOf(",");
          imageBase64 = commaIndex !== -1 ? src.slice(commaIndex + 1) : null;
        } else if (src) {
          imageBase64 = src;
        }
      }
    }

    questions.push({ number, text, options, imageBase64 });
  });

  questions.sort((a, b) => a.number - b.number);
  return questions;
}
