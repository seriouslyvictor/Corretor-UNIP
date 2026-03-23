const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  fileName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = function (e) {
    processHTML(e.target.result);
  };
  reader.readAsText(file);
});

function parseFromPaste() {
  const html = document.getElementById("pasteArea").value.trim();
  if (!html) {
    showError("Cole o HTML primeiro.");
    return;
  }
  processHTML(html);
}

function processHTML(rawHTML) {
  showError("");

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");

  const items = doc.querySelectorAll("li.liItem");
  if (items.length === 0) {
    showError("Nenhuma questao encontrada. Verifique se o HTML esta correto.");
    return;
  }

  const results = [];

  items.forEach(function (item) {
    const h3 = item.querySelector("h3");
    if (!h3) return;
    const numMatch = h3.textContent.match(/Pergunta\s+(\d+)/i);
    const num = numMatch ? numMatch[1] : null;
    if (!num) return;

    const answerDivs = item.querySelectorAll(".reviewQuestionsAnswerDiv");
    const seen = new Set();
    let correctLetter = null;

    for (const div of answerDivs) {
      const flag = div.querySelector(".correctAnswerFlag");
      if (flag) {
        const letterEl = div.querySelector(".answerNumLabelSpan");
        if (letterEl) {
          const letter = letterEl.textContent.trim().replace(".", "");
          if (!seen.has(letter)) {
            seen.add(letter);
            correctLetter = letter;
          }
        }
      }
    }

    if (correctLetter) {
      results.push({ num: parseInt(num), letter: correctLetter });
    }
  });

  if (results.length === 0) {
    showError("Nenhuma resposta correta encontrada no HTML.");
    return;
  }

  results.sort(function (a, b) { return a.num - b.num; });
  showResults(results);
}

function showResults(results) {
  document.getElementById("inputScreen").classList.add("hidden");
  document.getElementById("resultScreen").classList.add("active");
  document.getElementById("countLabel").textContent = results.length + " questoes";

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  results.forEach(function (r) {
    const div = document.createElement("div");
    div.className = "gabarito-item";
    div.innerHTML =
      '<div class="num">Questao ' + r.num + '</div>' +
      '<div class="answer">' + escapeHtml(r.letter) + '</div>';
    grid.appendChild(div);
  });
}

function goBack() {
  document.getElementById("inputScreen").classList.remove("hidden");
  document.getElementById("resultScreen").classList.remove("active");
}

function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
}

function escapeHtml(t) {
  var d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}
