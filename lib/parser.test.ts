import { describe, it, expect } from "vitest";
import { parseHTML } from "./parser";

const FIXTURE_TWO_QUESTIONS = `
<ul>
  <li class="liItem">
    <h3>Pergunta 1</h3>
    <div class="vtbegenerated"><p>What is 2+2?</p></div>
    <div class="reviewQuestionsAnswerDiv">
      <span class="answerNumLabelSpan">A.</span>
      <span class="answerTextSpan">3</span>
    </div>
    <div class="reviewQuestionsAnswerDiv">
      <span class="answerNumLabelSpan">B.</span>
      <span class="answerTextSpan">4</span>
    </div>
  </li>
  <li class="liItem">
    <h3>Pergunta 2</h3>
    <div class="vtbegenerated"><p>Capital of Brazil?</p></div>
    <div class="reviewQuestionsAnswerDiv">
      <span class="answerNumLabelSpan">A.</span>
      <span class="answerTextSpan">Brasilia</span>
    </div>
  </li>
</ul>`;

const FIXTURE_WITH_IMAGE = `
<ul>
  <li class="liItem">
    <h3>Pergunta 1</h3>
    <div class="vtbegenerated">
      <p>Observe the image:</p>
      <img src="data:image/png;base64,iVBORw0KGgo=" />
    </div>
    <div class="reviewQuestionsAnswerDiv">
      <span class="answerNumLabelSpan">A.</span>
      <span class="answerTextSpan">Option A</span>
    </div>
  </li>
</ul>`;

describe("parseHTML", () => {
  it("extracts two questions with correct numbers and options", () => {
    const result = parseHTML(FIXTURE_TWO_QUESTIONS);
    expect(result).toHaveLength(2);
    expect(result[0].number).toBe(1);
    expect(result[0].text).toBe("What is 2+2?");
    expect(result[0].options).toHaveLength(2);
    expect(result[0].options[0]).toEqual({ letter: "A", text: "3" });
    expect(result[0].options[1]).toEqual({ letter: "B", text: "4" });
    expect(result[1].number).toBe(2);
  });

  it("returns empty array for HTML with no questions", () => {
    expect(parseHTML("<div>nothing</div>")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseHTML("")).toEqual([]);
    expect(parseHTML("   ")).toEqual([]);
  });

  it("extracts base64 image from data URI", () => {
    const result = parseHTML(FIXTURE_WITH_IMAGE);
    expect(result).toHaveLength(1);
    expect(result[0].imageBase64).toBe("iVBORw0KGgo=");
  });

  it("sets imageBase64 to null when no image present", () => {
    const result = parseHTML(FIXTURE_TWO_QUESTIONS);
    expect(result[0].imageBase64).toBeNull();
  });

  it("strips trailing dot from option letters", () => {
    const result = parseHTML(FIXTURE_TWO_QUESTIONS);
    expect(result[0].options[0].letter).toBe("A");
    expect(result[0].options[0].letter).not.toContain(".");
  });
});
