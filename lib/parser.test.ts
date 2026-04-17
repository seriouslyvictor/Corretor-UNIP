import { describe, it, expect } from "vitest";
import { parseHTML } from "./parser";

// Mirrors actual UNIP take-test page structure
const FIXTURE_TWO_QUESTIONS = `
<div id="_q1_1" class="takeQuestionDiv">
  <h3 id="steptitle1" class="steptitle">Pergunta 1</h3>
  <div id="stepcontent1" class="stepcontent">
    <ol role="presentation">
      <li>
        <div class="field">
          <fieldset>
            <legend class="legend-visible">
              <div class="vtbegenerated inlineVtbegenerated"><p>What is 2+2?</p></div>
            </legend>
            <table class="multiple-choice-table">
              <tbody>
                <tr>
                  <td class="multiple-option-row"><input type="radio"></td>
                  <td class="multiple-choice-numbering multiple-option-row">a.</td>
                  <td><div class="vtbegenerated inlineVtbegenerated"><label><p>3</p></label></div></td>
                </tr>
                <tr>
                  <td class="multiple-option-row"><input type="radio"></td>
                  <td class="multiple-choice-numbering multiple-option-row">b.</td>
                  <td><div class="vtbegenerated inlineVtbegenerated"><label><p>4</p></label></div></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </div>
      </li>
    </ol>
  </div>
</div>
<div id="_q2_1" class="takeQuestionDiv">
  <h3 id="steptitle2" class="steptitle">Pergunta 2</h3>
  <div id="stepcontent2" class="stepcontent">
    <ol role="presentation">
      <li>
        <div class="field">
          <fieldset>
            <legend class="legend-visible">
              <div class="vtbegenerated inlineVtbegenerated"><p>Capital of Brazil?</p></div>
            </legend>
            <table class="multiple-choice-table">
              <tbody>
                <tr>
                  <td class="multiple-option-row"><input type="radio"></td>
                  <td class="multiple-choice-numbering multiple-option-row">a.</td>
                  <td><div class="vtbegenerated inlineVtbegenerated"><label><p>Brasilia</p></label></div></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </div>
      </li>
    </ol>
  </div>
</div>`;

// Mirrors Q1/Q4/Q5 from the real exam: text is a direct text node in .vtbegenerated (no <p>)
const FIXTURE_NO_P_WRAPPER = `
<div id="_q1_1" class="takeQuestionDiv">
  <h3 id="steptitle1" class="steptitle">Pergunta 1</h3>
  <div id="stepcontent1" class="stepcontent">
    <ol role="presentation">
      <li>
        <div class="field">
          <fieldset>
            <legend class="legend-visible">
              <div class="vtbegenerated inlineVtbegenerated"><!--RsQ_008-->Classify memory types by speed.</div>
            </legend>
            <table class="multiple-choice-table">
              <tbody>
                <tr>
                  <td class="multiple-option-row"><input type="radio"></td>
                  <td class="multiple-choice-numbering multiple-option-row">a.</td>
                  <td><div class="vtbegenerated inlineVtbegenerated"><label for="opt-a">Registers – Cache – RAM – Disk</label></div></td>
                </tr>
                <tr>
                  <td class="multiple-option-row"><input type="radio"></td>
                  <td class="multiple-choice-numbering multiple-option-row">b.</td>
                  <td><div class="vtbegenerated inlineVtbegenerated"><label for="opt-b">Cache – ROM – Registers – Disk</label></div></td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </div>
      </li>
    </ol>
  </div>
</div>`;

const FIXTURE_WITH_IMAGE = `
<div id="_q1_1" class="takeQuestionDiv">
  <h3 class="steptitle">Pergunta 1</h3>
  <div class="stepcontent">
    <ol><li><div class="field">
      <fieldset>
        <legend class="legend-visible">
          <div class="vtbegenerated inlineVtbegenerated">
            <p>Observe the image:</p>
            <img src="data:image/png;base64,iVBORw0KGgo=" />
          </div>
        </legend>
        <table class="multiple-choice-table">
          <tbody>
            <tr>
              <td class="multiple-option-row"><input type="radio"></td>
              <td class="multiple-choice-numbering multiple-option-row">a.</td>
              <td><div class="vtbegenerated inlineVtbegenerated"><label><p>Option A</p></label></div></td>
            </tr>
          </tbody>
        </table>
      </fieldset>
    </div></li></ol>
  </div>
</div>`;

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

  it("uppercases option letters and strips trailing dot", () => {
    const result = parseHTML(FIXTURE_TWO_QUESTIONS);
    expect(result[0].options[0].letter).toBe("A");
    expect(result[0].options[0].letter).not.toContain(".");
  });

  it("extracts question text and options when no <p> wrapper is used", () => {
    const result = parseHTML(FIXTURE_NO_P_WRAPPER);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
    expect(result[0].text).toBe("Classify memory types by speed.");
    expect(result[0].options).toHaveLength(2);
    expect(result[0].options[0]).toEqual({ letter: "A", text: "Registers \u2013 Cache \u2013 RAM \u2013 Disk" });
    expect(result[0].options[1]).toEqual({ letter: "B", text: "Cache \u2013 ROM \u2013 Registers \u2013 Disk" });
  });
});
