const moduleCards = [...document.querySelectorAll(".module-card")];
const codeSamples = document.querySelectorAll("[data-code-sample]");
const quizzes = document.querySelectorAll("[data-quiz]");

let currentModuleIndex = 0;

function toggleVisibility(id) {
  document.querySelector(`#${id}`).classList.toggle("hidden");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function splitLines(text) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffix(a, b, prefixLen) {
  let i = 0;
  while (i < a.length - prefixLen && i < b.length - prefixLen && a[a.length - 1 - i] === b[b.length - 1 - i]) {
    i += 1;
  }
  return i;
}

function renderLineDiff(currentLine, baselineLine) {
  if (currentLine === baselineLine) {
    return escapeHtml(currentLine) || "&nbsp;";
  }

  const prefixLen = commonPrefix(currentLine, baselineLine);
  const suffixLen = commonSuffix(currentLine, baselineLine, prefixLen);
  const prefix = escapeHtml(currentLine.slice(0, prefixLen));
  const changed = escapeHtml(currentLine.slice(prefixLen, currentLine.length - suffixLen));
  const suffix = escapeHtml(currentLine.slice(currentLine.length - suffixLen));

  return `<span class="code-sample__line-body">${prefix}${changed ? `<span class="code-sample__changed">${changed}</span>` : ""}${suffix}</span>` || "&nbsp;";
}

function diffLines(baselineLines, currentLines) {
  const m = baselineLines.length;
  const n = currentLines.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = baselineLines[i] === currentLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const matches = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (baselineLines[i] === currentLines[j]) {
      matches.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  const currentToBaseline = new Map(matches.map(([baseIndex, currentIndex]) => [currentIndex, baseIndex]));
  let lastBase = -1;
  let lastCurrent = -1;

  for (const [baseIndex, currentIndex] of matches) {
    const currentGap = currentIndex - lastCurrent - 1;
    for (let offset = 1; offset <= currentGap; offset += 1) {
      const baseCandidate = lastBase + offset;
      const currentCandidate = lastCurrent + offset;
      if (currentCandidate < currentIndex) {
        currentToBaseline.set(currentCandidate, Math.min(baseCandidate, baselineLines.length - 1));
      }
    }

    lastBase = baseIndex;
    lastCurrent = currentIndex;
  }

  for (let currentIndex = lastCurrent + 1; currentIndex < currentLines.length; currentIndex += 1) {
    const baseIndex = Math.min(lastBase + 1 + (currentIndex - lastCurrent - 1), baselineLines.length - 1);
    if (baseIndex >= 0) {
      currentToBaseline.set(currentIndex, baseIndex);
    }
  }

  return { currentToBaseline };
}

function renderCodeSample(sample) {
  const input = sample.querySelector("[data-code-input]");
  const overlay = sample.querySelector("[data-code-overlay]");
  const linesEl = sample.querySelector("[data-code-lines]");
  const baseline = sample.dataset.baseline ?? input.value;
  const currentLines = splitLines(input.value.replace(/\r\n/g, "\n"));
  const baselineLines = splitLines(baseline);
  const { currentToBaseline } = diffLines(baselineLines, currentLines);

  linesEl.innerHTML = currentLines.map((_, index) => `<span class="code-sample__line-number">${index + 1}</span>`).join("");
  overlay.innerHTML = currentLines
    .map((line, index) => {
      const baseIndex = currentToBaseline.get(index);
      const rendered = baseIndex === undefined
        ? `<span class="code-sample__line-body"><span class="code-sample__changed">${escapeHtml(line) || "&nbsp;"}</span></span>`
        : renderLineDiff(line, baselineLines[baseIndex]);
      return `<span class="code-sample__line">${rendered}</span>`;
    })
    .join("");
}

function setupCodeSample(sample) {
  const input = sample.querySelector("[data-code-input]");
  const resetButton = sample.querySelector("[data-code-reset]");
  sample.dataset.baseline = input.value.replace(/\r\n/g, "\n");

  input.addEventListener("input", () => renderCodeSample(sample));
  input.addEventListener("scroll", () => {
    const overlay = sample.querySelector("[data-code-overlay]");
    const linesEl = sample.querySelector("[data-code-lines]");
    const offset = input.scrollTop;
    overlay.style.transform = `translateY(-${offset}px)`;
    linesEl.style.transform = `translateY(-${offset}px)`;
  });
  resetButton.addEventListener("click", () => {
    input.value = sample.dataset.baseline;
    renderCodeSample(sample);
    input.focus();
  });

  renderCodeSample(sample);
}

function setupQuiz(quiz) {
  console.log(quiz)
  const items = quiz.querySelectorAll("[data-quiz-item]");
  const checkButton = quiz.querySelector("[data-quiz-check]");
  const resetButton = quiz.querySelector("[data-quiz-reset]");
  const result = quiz.querySelector("[data-quiz-result]");

  items.forEach((item) => {
    const itemResult = document.createElement("div");
    itemResult.className = "quiz__result";
    itemResult.setAttribute("aria-live", "polite");
    item.appendChild(itemResult);

    item.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener("change", () => {
        itemResult.textContent = "";
        itemResult.className = "quiz__result";
      });
    });
  });

  checkButton.addEventListener("click", () => {
    let score = 0;
    let answered = 0;

    items.forEach((item) => {
      const correct = item.dataset.correct;
      if (!correct) return;

      const selected = item.querySelector('input[type="radio"]:checked');
      if (selected) {
        answered += 1;
        if (selected.value === correct) {
          score += 1;
        }
      }
    });

    result.textContent = `Score: ${score} / ${items.length}`;
    result.className = score === items.length ? "quiz__result is-correct" : "quiz__result is-wrong";
  });

  resetButton.addEventListener("click", () => {
    items.forEach((item) => {
      item.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.checked = false;
      });
    });
    result.textContent = "";
    result.className = "quiz__result";
  });
}

function showModule(index) {
  currentModuleIndex = (index + moduleCards.length) % moduleCards.length;
  moduleCards.forEach((card, cardIndex) => {
    card.hidden = cardIndex !== currentModuleIndex;
  });
}

function moveModule(delta) {
  showModule(currentModuleIndex + delta);
}

document.addEventListener("click", (event) => {
  const edgeWidth = Math.max(60, Math.floor(window.innerWidth * 0.08));
  const x = event.clientX;

  if (x <= edgeWidth) {
    moveModule(-1);
  } else if (x >= window.innerWidth - edgeWidth) {
    moveModule(1);
  }
});

codeSamples.forEach(setupCodeSample);
quizzes.forEach(setupQuiz);

showModule(0);
