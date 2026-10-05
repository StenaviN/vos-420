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
  startButton.disabled = selected.length === 0;
  if (selected.length) error.hidden = true;
}

function openQuiz(view) {
  const selected = selectedTopics();
  if (!selected.length) {
    error.hidden = false;
    return;
  }
  const keys = selected.map((box) => box.value).join(",");
  location.href = `quiz.html?topics=${keys}${view === "stats" ? "&view=stats" : ""}`;
}

selectAll.addEventListener("change", () => {
  topicBoxes.forEach((box) => {
    box.checked = selectAll.checked;
  });
  updateSelection();
});
topicBoxes.forEach((box) => box.addEventListener("change", updateSelection));
homeTabs.forEach((button) =>
  button.addEventListener("click", () => showHomeTab(button.dataset.homeTab, true)),
);
window.addEventListener("popstate", () => showHomeTab(homeTabFromUrl()));
startButton.addEventListener("click", () => openQuiz("quiz"));
statsButton.addEventListener("click", () => openQuiz("stats"));
updateSelection();
showHomeTab(homeTabFromUrl());
