"use strict";

const topicBoxes = [...document.querySelectorAll('input[name="quizTopic"]')];
const selectAll = document.querySelector("#selectAllTopics");
const summary = document.querySelector("#quizSelectionSummary");
const error = document.querySelector("#quizSelectionError");
const statsButton = document.querySelector("#openQuizStats");
const startButton = document.querySelector("#startSelectedQuiz");
const homeTabs = [...document.querySelectorAll("[data-home-tab]")];
const topicsPanel = document.querySelector("#topicsPanel");
const quizPanel = document.querySelector("#quizPanel");
const glossaryPanel = document.querySelector("#glossaryPanel");
const searchPanel = document.querySelector("#searchPanel");
const countSelect = document.querySelector("#countSelect");
const settingNames = ["examMode", "includeMastered", "prioritizeMistakes", "autoAdvanceCorrect"];
const questionBanks = new Map();
let banksReady = false;
let countChosen = false;

function selectedSettings() {
  return Object.fromEntries(
    settingNames.map((name) => [name, document.getElementById(name).checked]),
  );
}

function restoreSelection() {
  const params = new URLSearchParams(location.search);
  const keys = (params.get("topics") || params.get("topic") || "").split(",");
  topicBoxes.forEach((box) => {
    box.checked = keys.includes(box.value);
  });
  try {
    const saved = JSON.parse(sessionStorage.getItem("vos420-quiz-settings") || "null");
    if (saved) {
      settingNames.forEach((name) => {
        if (typeof saved[name] === "boolean") document.getElementById(name).checked = saved[name];
      });
      countSelect.dataset.preferred = saved.count;
      countChosen = true;
    }
  } catch {
    /* Settings are optional. */
  }
}

function availableCount(selected) {
  if (!banksReady) return 0;
  let stats = {};
  try {
    stats = JSON.parse(localStorage.getItem("vos420-quiz-statistics-v1"))?.topics || {};
  } catch {
    /* No statistics yet. */
  }
  const questions = selected.flatMap((box) => questionBanks.get(box.value) || []);
  if (document.querySelector("#includeMastered").checked) return questions.length;
  const remaining = questions.filter((item) => {
    const stat = stats[item.topicId]?.questions?.[item.id];
    return (
      !stat ||
      !(
        stat.correct + stat.wrong >= 2 &&
        stat.streak >= 2 &&
        stat.correct / (stat.correct + stat.wrong) >= 0.8
      )
    );
  }).length;
  // Match the engine: once everything is mastered, offer all questions again.
  return remaining || questions.length;
}

async function loadQuestionBanks() {
  try {
    for (const meta of window.QUIZ_META.topics) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${meta.path}/quiz-data.js?v=${encodeURIComponent(window.ASSET_VERSION || "")}`;
        script.onload = () => {
          questionBanks.set(
            meta.key,
            window.QUIZ_CONFIG.questions.map((item) => ({ id: item.id, topicId: meta.id })),
          );
          delete window.QUIZ_CONFIG;
          script.remove();
          resolve();
        };
        script.onerror = reject;
        document.body.append(script);
      });
    }
    banksReady = true;
    updateSelection();
  } catch {
    error.textContent = "Не вдалося завантажити питання. Онови сторінку, щоб спробувати ще раз.";
    error.hidden = false;
  }
}

function homeTabFromUrl() {
  if (location.hash === "#quiz") return "quiz";
  if (location.hash === "#glossary" || location.hash.startsWith("#glossary:")) return "glossary";
  if (location.hash === "#search") return "search";
  return "topics";
}

function updateHomeTabUrl(name) {
  const url = new URL(location.href);
  url.hash =
    name === "quiz"
      ? "quiz"
      : name === "glossary"
        ? "glossary"
        : name === "search"
          ? "search"
          : "topics";
  if (url.href !== location.href) history.pushState(null, "", url);
}

function showHomeTab(name, updateUrl = false) {
  topicsPanel.hidden = name !== "topics";
  quizPanel.hidden = name !== "quiz";
  glossaryPanel.hidden = name !== "glossary";
  searchPanel.hidden = name !== "search";
  homeTabs.forEach((button) => {
    const active = button.dataset.homeTab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (updateUrl) updateHomeTabUrl(name);
}

function selectedTopics() {
  return topicBoxes.filter((box) => box.checked);
}

function updateSelection() {
  const selected = selectedTopics();
  const questions = selected.reduce((total, box) => total + Number(box.dataset.questions), 0);
  const topicWord =
    selected.length === 1 ? "тему" : selected.length >= 2 && selected.length <= 4 ? "теми" : "тем";
  selectAll.checked = selected.length === topicBoxes.length;
  selectAll.indeterminate = selected.length > 0 && selected.length < topicBoxes.length;
  summary.textContent = `Обрано ${selected.length} ${topicWord} · доступно ${questions} питань`;
  statsButton.disabled = selected.length === 0;
  const available = availableCount(selected);
  startButton.disabled = selected.length === 0 || !banksReady || !available;
  const preferred = countSelect.dataset.preferred || countSelect.value;
  const defaultCount =
    selected.length === 1
      ? window.QUIZ_META.topics.find((meta) => meta.key === selected[0].value).defaultSize
      : 50;
  const values = [...new Set([10, 15, 20, 25, 30, 40, 50, 75, 100, defaultCount])]
    .filter((value) => value < available)
    .sort((a, b) => a - b);
  countSelect.replaceChildren(
    ...values.map((value) => new Option(String(value), String(value))),
    new Option(`Усі (${available})`, "all"),
  );
  const desired = countChosen ? preferred : String(defaultCount);
  countSelect.value = [...countSelect.options].some((option) => option.value === desired)
    ? desired
    : "all";
  countSelect.disabled = !available;
  document.querySelector("#autoAdvanceCorrect").disabled =
    document.querySelector("#examMode").checked;
  document.querySelector("#eligibleHint").textContent = !banksReady
    ? "Завантаження питань…"
    : `Для цієї спроби доступно ${available} питань.${document.querySelector("#examMode").checked ? ` Загальний час: ${Math.min(available, Number(countSelect.value) || available) / 2} хв.` : ""}`;
  if (selected.length) error.hidden = true;
}

function openQuiz(view) {
  const selected = selectedTopics();
  if (!selected.length) {
    error.hidden = false;
    return;
  }
  const keys = selected.map((box) => box.value).join(",");
  const settings = { ...selectedSettings(), count: countSelect.value };
  try {
    sessionStorage.setItem("vos420-quiz-settings", JSON.stringify(settings));
  } catch {
    /* Optional. */
  }
  const params = new URLSearchParams({ topics: keys });
  if (view === "stats") params.set("view", "stats");
  else {
    params.set("start", "1");
    params.set("count", settings.count);
    settingNames.forEach((name) => params.set(name, settings[name] ? "1" : "0"));
  }
  location.href = `quiz.html?${params}`;
}

selectAll.addEventListener("change", () => {
  topicBoxes.forEach((box) => {
    box.checked = selectAll.checked;
  });
  updateSelection();
});
function selectionChanged() {
  const url = new URL(location.href);
  url.searchParams.delete("topic");
  url.searchParams.set(
    "topics",
    selectedTopics()
      .map((box) => box.value)
      .join(","),
  );
  history.replaceState(null, "", url);
  updateSelection();
}
topicBoxes.forEach((box) => box.addEventListener("change", selectionChanged));
selectAll.addEventListener("change", selectionChanged);
countSelect.addEventListener("change", () => {
  countChosen = true;
  countSelect.dataset.preferred = countSelect.value;
  updateSelection();
});
settingNames.forEach((name) =>
  document.getElementById(name).addEventListener("change", updateSelection),
);
homeTabs.forEach((button) =>
  button.addEventListener("click", () => showHomeTab(button.dataset.homeTab, true)),
);
window.addEventListener("popstate", () => {
  restoreSelection();
  updateSelection();
  showHomeTab(homeTabFromUrl());
});
window.addEventListener("pageshow", updateSelection);
window.addEventListener("storage", updateSelection);
startButton.addEventListener("click", () => openQuiz("quiz"));
statsButton.addEventListener("click", () => openQuiz("stats"));
restoreSelection();
window.initQuizTransfer(updateSelection);
updateSelection();
showHomeTab(homeTabFromUrl());
loadQuestionBanks();
