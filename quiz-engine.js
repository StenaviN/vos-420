"use strict";

const config = window.QUIZ_CONFIG;
if (!config || !Array.isArray(config.questions))
  throw new Error("QUIZ_CONFIG is missing or invalid");
const isMixed = config.topicIds.length > 1;

const letters = ["А", "Б", "В", "Г"];
const STATE_VERSION = 6;
const ACTIVE_KEY = `vos420-${config.id}-active-v6`;
const STATS_KEY = "vos420-quiz-statistics-v1";
const DISTRACTOR_HISTORY_KEY = "vos420-distractor-history-v1";

const state = {
  questions: [],
  index: 0,
  score: 0,
  selected: null,
  answered: false,
  mistakes: [],
  answers: [],
  activeElapsedMs: 0,
  timerStartedAt: null,
  questionStartedAt: null,
  settings: null,
  finished: false,
};
let pendingSavedState = null;
let autoAdvanceTimer = null;

const $ = (selector) => document.querySelector(selector);
const elements = {
  examMode: $("#examMode"),
  examTimer: $("#examTimer"),
  setupPanel: $("#setupPanel"),
  resumePanel: $("#resumePanel"),
  quizPanel: $("#quizPanel"),
  resultPanel: $("#resultPanel"),
  statsPanel: $("#statsPanel"),
  quizTitle: $("#quizTitle"),
  topicLabel: $("#topicLabel"),
  countSelect: $("#countSelect"),
  includeMastered: $("#includeMastered"),
  prioritizeMistakes: $("#prioritizeMistakes"),
  autoAdvanceCorrect: $("#autoAdvanceCorrect"),
  eligibleHint: $("#eligibleHint"),
  startButton: $("#startButton"),
  resumeSummary: $("#resumeSummary"),
  resumeButton: $("#resumeButton"),
  newQuizButton: $("#newQuizButton"),
  questionTopic: $("#questionTopic"),
  questionText: $("#questionText"),
  answers: $("#answers"),
  feedback: $("#feedback"),
  feedbackTitle: $("#feedbackTitle"),
  feedbackText: $("#feedbackText"),
  referenceLink: $("#referenceLink"),
  checkButton: $("#checkButton"),
  nextButton: $("#nextButton"),
  finishButton: $("#finishButton"),
  navigation: $("#questionNavigation"),
  navigationSummary: $("#questionNavigationSummary"),
  restartButton: $("#restartButton"),
  progressText: $("#progressText"),
  progressBar: $("#progressBar"),
  scoreText: $("#scoreText"),
  bestText: $("#bestText"),
  resultTitle: $("#resultTitle"),
  resultMessage: $("#resultMessage"),
  resultCorrectTotal: $("#resultCorrectTotal"),
  resultGrade: $("#resultGrade"),
  resultPercent: $("#resultPercent"),
  resultTime: $("#resultTime"),
  mistakes: $("#mistakes"),
  statsSummary: $("#statsSummary"),
  trendChart: $("#trendChart"),
  topicChart: $("#topicChart"),
  hardQuestions: $("#hardQuestions"),
  questionStatsBody: $("#questionStatsBody"),
  historyBody: $("#historyBody"),
  statsScope: $("#statsScope"),
  statsResetTopic: $("#statsResetTopic"),
  clearTopicStats: $("#clearTopicStats"),
  clearAllStats: $("#clearAllStats"),
  statsResetStatus: $("#statsResetStatus"),
};

elements.topicLabel.textContent = isMixed ? config.label : "";
elements.topicLabel.hidden = !isMixed;
elements.quizTitle.textContent = config.title;
$("#noteLink").href = config.notePath;
$("#resultNoteLink").href = config.notePath;
$("#noteLink").hidden = isMixed;
$("#resultNoteLink").hidden = isMixed;
document.title = `${config.title} - вікторина`;

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatDuration(milliseconds) {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function gradeFor(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 500) / 100;
}

function readStats() {
  try {
    const data = JSON.parse(localStorage.getItem(STATS_KEY));
    if (!data || data.version !== 1) return { version: 1, topics: {}, mixedAttempts: [] };
    data.topics ||= {};
    data.mixedAttempts ||= [];
    return data;
  } catch {
    return { version: 1, topics: {}, mixedAttempts: [] };
  }
}

function writeStats(data) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  } catch {
    /* Statistics are optional. */
  }
}

function ensureTopicStats(data, topicId, label) {
  if (!data.topics[topicId])
    data.topics[topicId] = { label, attempts: [], mixedSegments: [], questions: {} };
  data.topics[topicId].attempts ||= [];
  data.topics[topicId].mixedSegments ||= [];
  data.topics[topicId].questions ||= {};
  return data.topics[topicId];
}

function topicHasStats(topic) {
  return Boolean(
    topic &&
    (topic.attempts?.length ||
      topic.mixedSegments?.length ||
      Object.values(topic.questions || {}).some((item) => item.correct + item.wrong > 0)),
  );
}

function hasSavedResults(data, topicId = null) {
  return Object.entries(data.latestResults || {}).some(
    ([key, result]) => !topicId || key === topicId || result.topicIds?.includes(topicId),
  );
}

function updateResetControls(data = readStats()) {
  const topic = data.topics[elements.statsResetTopic.value];
  elements.clearTopicStats.disabled =
    !topicHasStats(topic) && !hasSavedResults(data, elements.statsResetTopic.value);
  elements.clearAllStats.disabled =
    !data.mixedAttempts.length &&
    !Object.values(data.topics).some(topicHasStats) &&
    !hasSavedResults(data);
}

function clearSelectedTopicStats() {
  const meta = window.QUIZ_META.topics.find((item) => item.id === elements.statsResetTopic.value);
  if (!meta) return;
  const data = readStats();
  if (!topicHasStats(data.topics[meta.id]) && !hasSavedResults(data, meta.id)) return;
  if (
    !window.confirm(
      `Очистити всю статистику для «${meta.shortLabel}: ${meta.name}» і збережені результати останніх спроб із цією темою? Цю дію неможливо скасувати.`,
    )
  )
    return;
  delete data.topics[meta.id];
  for (const [key, result] of Object.entries(data.latestResults || {})) {
    if (key === meta.id || result.topicIds?.includes(meta.id)) delete data.latestResults[key];
  }
  writeStats(data);
  renderStats();
  elements.statsResetStatus.textContent = `Статистику для «${meta.shortLabel}» очищено.`;
}

function clearAllStatistics() {
  const data = readStats();
  if (
    !data.mixedAttempts.length &&
    !Object.values(data.topics).some(topicHasStats) &&
    !hasSavedResults(data)
  )
    return;
  if (
    !window.confirm(
      "Очистити статистику всіх тем, всю історію спроб і всі збережені результати? Цю дію неможливо скасувати.",
    )
  )
    return;
  try {
    localStorage.removeItem(STATS_KEY);
  } catch {
    writeStats({ version: 1, topics: {}, mixedAttempts: [] });
  }
  renderStats();
  elements.statsResetStatus.textContent = "Усю статистику очищено.";
}

function questionStat(id) {
  const item = config.questions.find((question) => question.id === id);
  const data = readStats();
  const topic = ensureTopicStats(data, item.sourceTopicId, item.sourceTopicLabel);
  return topic.questions[id] || { shown: 0, correct: 0, wrong: 0, streak: 0, totalTimeMs: 0 };
}

function isMastered(stat) {
  const answered = stat.correct + stat.wrong;
  return answered >= 2 && stat.streak >= 2 && stat.correct / answered >= 0.8;
}

function normalizedOptionText(value) {
  return String(value)
    .toLocaleLowerCase("uk-UA")
    .replace(/[’'`]/g, "'")
    .replace(/[^\p{L}\p{N}%+/-]+/gu, " ")
    .trim();
}

function readDistractorHistory() {
  try {
    return JSON.parse(localStorage.getItem(DISTRACTOR_HISTORY_KEY)) || {};
  } catch {
    return {};
  }
}

function selectDistractors(item) {
  const pool = Array.isArray(item.wrong) ? item.wrong : [];
  if (pool.length <= 3) return shuffled(pool).slice(0, 3);
  const history = readDistractorHistory();
  let selected;
  let signature;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    selected = shuffled(pool).slice(0, 3);
    signature = selected.map(normalizedOptionText).sort().join("|");
    if (signature !== history[item.id]) break;
  }
  history[item.id] = signature;
  try {
    localStorage.setItem(DISTRACTOR_HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* The quiz remains usable without storage. */
  }
  return selected;
}

function normalizedQuestion(item) {
  if (item.correct !== undefined) {
    const wrong = selectDistractors(item);
    return {
      ...item,
      options: shuffled([
        { text: item.correct, correct: true },
        ...wrong.map((text) => ({ text, correct: false })),
      ]),
    };
  }
  return {
    ...item,
    options: shuffled(
      item.options.map((text, index) => ({ text, correct: index === item.answer })),
    ),
  };
}

function weightedPick(items, count, prioritize) {
  const pool = [...items];
  const picked = [];
  while (pool.length && picked.length < count) {
    const weights = pool.map((item) => {
      const stat = questionStat(item.id);
      if (!prioritize) return 1;
      const attempts = stat.correct + stat.wrong;
      if (!attempts) return 3;
      return 1 + (stat.wrong / attempts) * 7 + Math.min(stat.wrong, 4);
    });
    let cursor = Math.random() * weights.reduce((sum, value) => sum + value, 0);
    let index = 0;
    for (; index < weights.length - 1; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) break;
    }
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function eligibleQuestions(settings) {
  if (settings.includeMastered) return config.questions;
  const filtered = config.questions.filter((item) => !isMastered(questionStat(item.id)));
  return filtered.length ? filtered : config.questions;
}

function prepareQuestions(settings) {
  const eligible = eligibleQuestions(settings);
  const count =
    settings.count === "all" ? eligible.length : Math.min(Number(settings.count), eligible.length);
  if (!isMixed || count < config.topicIds.length || count === eligible.length) {
    return weightedPick(eligible, count, settings.prioritizeMistakes).map(normalizedQuestion);
  }
  const guaranteed = config.topicIds.flatMap((topicId) =>
    weightedPick(
      eligible.filter((item) => item.sourceTopicId === topicId),
      1,
      settings.prioritizeMistakes,
    ),
  );
  const guaranteedIds = new Set(guaranteed.map((item) => item.id));
  const remainder = weightedPick(
    eligible.filter((item) => !guaranteedIds.has(item.id)),
    count - guaranteed.length,
    settings.prioritizeMistakes,
  );
  return shuffled([...guaranteed, ...remainder]).map(normalizedQuestion);
}

function currentElapsed() {
  return state.activeElapsedMs + (state.timerStartedAt ? Date.now() - state.timerStartedAt : 0);
}

function examActive() {
  return Boolean(state.settings?.examMode && !state.finished);
}
function examAnsweredCount() {
  return state.questions.filter((item) => item.selected != null).length;
}
function updateExamTimer() {
  elements.examTimer.hidden = !examActive();
  if (!examActive()) return;
  const limit = state.questions.length * 30000;
  const remaining = Math.max(0, limit - currentElapsed());
  const warning = remaining <= Math.min(60000, limit * 0.2);
  elements.examTimer.classList.toggle("time-warning", warning);
  elements.examTimer.textContent = `Залишилося: ${formatDuration(Math.ceil(remaining / 1000) * 1000)}${warning ? " — час спливає!" : ""}`;
  if (!remaining) finishQuiz(true);
}

function startTimer() {
  if (!state.finished && !state.timerStartedAt && !document.hidden && !elements.quizPanel.hidden) {
    state.timerStartedAt = Date.now();
    if (!state.questionStartedAt) state.questionStartedAt = Date.now();
  }
}

function pauseTimer() {
  if (!state.timerStartedAt) return;
  state.activeElapsedMs += Date.now() - state.timerStartedAt;
  state.timerStartedAt = null;
  state.questionStartedAt = null;
}

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_KEY));
    return saved &&
      saved.version === STATE_VERSION &&
      Array.isArray(saved.questions) &&
      saved.questions.length &&
      saved.index >= 0 &&
      saved.index < saved.questions.length
      ? saved
      : null;
  } catch {
    return null;
  }
}

function saveState() {
  if (!state.questions.length || state.finished || !elements.resultPanel.hidden) return;
  try {
    localStorage.setItem(
      ACTIVE_KEY,
      JSON.stringify({
        version: STATE_VERSION,
        questions: state.questions,
        index: state.index,
        score: state.score,
        selected: state.selected,
        answered: state.answered,
        mistakes: state.mistakes,
        answers: state.answers,
        activeElapsedMs: currentElapsed(),
        settings: state.settings,
      }),
    );
  } catch {
    /* The quiz remains usable without storage. */
  }
}

function clearSavedState() {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* No action needed. */
  }
}

function bestAttempt() {
  const data = readStats();
  const attempts = isMixed
    ? data.mixedAttempts.filter((item) => item.topicIds.join(",") === config.topicIds.join(","))
    : [
        ...ensureTopicStats(data, config.topicIds[0], config.shortLabel).attempts,
        ...ensureTopicStats(data, config.topicIds[0], config.shortLabel).mixedSegments,
      ];
  return attempts.length ? Math.max(...attempts.map((item) => item.percent)) : null;
}

function updateHeader() {
  const total = state.questions.length;
  elements.progressText.textContent = total ? `${state.index + 1} / ${total}` : "-";
  elements.progressBar.style.width = total
    ? `${((examActive() ? examAnsweredCount() : state.answers.length) / total) * 100}%`
    : "0";
  elements.scoreText.textContent = examActive() ? "—" : String(state.score);
  const best = bestAttempt();
  elements.bestText.textContent = best === null ? "-" : `${best}%`;
}

function showOnly(panel) {
  [
    elements.setupPanel,
    elements.resumePanel,
    elements.quizPanel,
    elements.resultPanel,
    elements.statsPanel,
  ].forEach((item) => {
    item.hidden = item !== panel;
  });
  const activeView = panel === elements.statsPanel ? "stats" : "quiz";
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === activeView;
    button.classList.toggle("active", active);
    if (button.getAttribute("role") === "tab") button.setAttribute("aria-selected", String(active));
  });
}

function viewFromUrl() {
  const view = new URLSearchParams(location.search).get("view");
  return ["stats", "result"].includes(view) ? view : "quiz";
}

function updateViewUrl(view) {
  const url = new URL(location.href);
  if (view === "stats" || view === "result") url.searchParams.set("view", view);
  else url.searchParams.delete("view");
  if (url.href !== location.href) history.pushState(null, "", url);
}

function activateView(view, updateUrl = false) {
  if (view === "result") {
    openLatestResult();
    return;
  }
  if (view === "stats") {
    cancelAutoAdvance();
    pauseTimer();
    renderStats();
    showOnly(elements.statsPanel);
  } else if (
    state.questions.length &&
    !state.finished &&
    elements.quizPanel.hidden &&
    elements.resultPanel.hidden
  ) {
    showOnly(elements.quizPanel);
    startTimer();
  } else if (readSavedState()) showResumeChoice(readSavedState());
  else showSetup();
  if (updateUrl) updateViewUrl(view);
}

function selectAnswer(index) {
  if (state.finished || state.answered) return;
  if (examActive() && currentElapsed() >= state.questions.length * 30000) {
    finishQuiz(true);
    return;
  }
  state.selected = index;
  state.questions[state.index].selected = index;
  elements.checkButton.disabled = false;
  [...elements.answers.children].forEach((button, buttonIndex) => {
    button.classList.toggle("selected", buttonIndex === index);
    button.setAttribute("aria-checked", buttonIndex === index ? "true" : "false");
  });
  if (examActive()) {
    renderNavigation();
    updateHeader();
  }
  saveState();
}

function referenceUrl(reference, item) {
  return `${item.notePath || config.notePath}${reference}`;
}

function showAnsweredQuestion() {
  const item = state.questions[state.index];
  const selected = item.options[state.selected];
  const correctIndex = item.options.findIndex((option) => option.correct);
  [...elements.answers.children].forEach((button, index) => {
    button.disabled = true;
    if (index === correctIndex) button.classList.add("correct");
    if (index === state.selected && !selected.correct) button.classList.add("incorrect");
  });
  elements.feedbackTitle.textContent = selected.correct ? "Правильно" : "Неправильно";
  elements.feedback.classList.toggle("wrong", !selected.correct);
  elements.feedbackText.textContent = selected.correct
    ? item.explanation
    : `Правильна відповідь: ${item.options[correctIndex].text}. ${item.explanation}`;
  elements.referenceLink.href = referenceUrl(item.reference, item);
  elements.feedback.hidden = false;
  elements.checkButton.hidden = true;
  elements.nextButton.textContent = "Наступне питання";
  elements.nextButton.hidden = state.index === state.questions.length - 1;
}

function renderQuestion(restore = false) {
  const item = state.questions[state.index];
  state.selected = item.selected ?? null;
  state.answered = Boolean(item.checked);
  state.questionStartedAt = Date.now();
  elements.questionTopic.textContent = item.topic;
  elements.questionText.textContent = item.question;
  elements.answers.replaceChildren();
  elements.feedback.hidden = true;
  elements.feedback.classList.remove("wrong");
  elements.checkButton.hidden = examActive();
  elements.checkButton.disabled = true;
  elements.nextButton.textContent = "Наступне питання";
  elements.nextButton.hidden = state.index === state.questions.length - 1;
  item.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", index === state.selected ? "true" : "false");
    button.classList.toggle("selected", index === state.selected);
    button.innerHTML = `<span class="answer-letter">${letters[index]}</span><span></span>`;
    button.lastElementChild.textContent = option.text;
    button.addEventListener("click", () => selectAnswer(index));
    elements.answers.append(button);
  });
  if (state.answered && state.selected !== null) showAnsweredQuestion();
  else elements.checkButton.disabled = state.selected === null;
  updateHeader();
  renderNavigation();
  updateExamTimer();
  saveState();
}

function recordAnswer(item, correct) {
  const data = readStats();
  const topic = ensureTopicStats(data, item.sourceTopicId, item.sourceTopicLabel);
  const stat = topic.questions[item.id] || {
    shown: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    totalTimeMs: 0,
  };
  stat.shown += 1;
  stat[correct ? "correct" : "wrong"] += 1;
  stat.streak = correct ? stat.streak + 1 : 0;
  stat.lastCorrect = correct;
  stat.lastSeen = new Date().toISOString();
  stat.totalTimeMs += state.questionStartedAt
    ? Math.max(0, Date.now() - state.questionStartedAt)
    : 0;
  topic.questions[item.id] = stat;
  topic.label = item.sourceTopicLabel;
  writeStats(data);
}

function checkAnswer() {
  if (examActive() || state.finished || state.selected === null || state.answered) return;
  state.answered = true;
  const item = state.questions[state.index];
  const selected = item.options[state.selected];
  const correctIndex = item.options.findIndex((option) => option.correct);
  if (selected.correct) state.score += 1;
  else
    state.mistakes.push({
      question: item.question,
      selected: selected.text,
      correct: item.options[correctIndex].text,
      explanation: item.explanation,
      reference: item.reference,
      notePath: item.notePath,
    });
  item.checked = true;
  item.selected = state.selected;
  state.answers.push({ id: item.id, correct: selected.correct, selected: state.selected });
  recordAnswer(item, selected.correct);
  showAnsweredQuestion();
  updateHeader();
  renderNavigation();
  saveState();
  if (
    selected.correct &&
    state.settings.autoAdvanceCorrect &&
    state.index < state.questions.length - 1
  ) {
    elements.nextButton.hidden = true;
    autoAdvanceTimer = window.setTimeout(nextQuestion, 650);
  } else {
    (elements.nextButton.hidden ? elements.finishButton : elements.nextButton).focus();
  }
}

function renderMistakes() {
  elements.mistakes.replaceChildren();
  const navigation = $("#resultNavigation");
  navigation.replaceChildren();
  let visible = 0;
  state.questions.forEach((item, index) => {
    const answer = state.answers.find((entry) => entry.id === item.id);
    const status = answer ? (answer.correct ? "correct" : "incorrect") : "unanswered";
    const filtered =
      (status === "correct" && !$("#showCorrectResults").checked) ||
      (status === "unanswered" && !$("#showUnansweredResults").checked);
    if (!filtered) visible += 1;
    const label = answer
      ? answer.correct
        ? "Правильно"
        : "Неправильно"
      : "Без перевіреної відповіді";
    const article = document.createElement("article");
    article.className = `mistake-item result-question ${status}`;
    article.hidden = filtered;
    article.id = `result-question-${index + 1}`;
    article.tabIndex = -1;
    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${item.question}`;
    const badge = document.createElement("p");
    badge.className = "result-status";
    badge.textContent = `${answer ? (answer.correct ? "✓" : "×") : "○"} ${label}`;
    article.append(title, badge);
    // Unanswered questions must not reveal the solution or its explanation.
    if (answer) {
      const selected = document.createElement("p");
      selected.className = `result-answer ${answer.correct ? "answer-right" : "answer-wrong"}`;
      const selectedLabel = document.createElement("span");
      selectedLabel.className = "result-detail-label";
      selectedLabel.textContent = "Твоя відповідь";
      const selectedValue = document.createElement("strong");
      selectedValue.textContent = item.options[answer.selected ?? item.selected].text;
      selected.append(selectedLabel, selectedValue);
      article.append(selected);
      if (!answer.correct) {
        const correct = document.createElement("p");
        correct.className = "correct-answer result-answer answer-right";
        const correctLabel = document.createElement("span");
        correctLabel.className = "result-detail-label";
        correctLabel.textContent = "Правильна відповідь";
        const correctValue = document.createElement("strong");
        correctValue.textContent = item.options.find((option) => option.correct).text;
        correct.append(correctLabel, correctValue);
        article.append(correct);
      }
      const explanation = document.createElement("p");
      explanation.className = "result-explanation";
      const explanationLabel = document.createElement("span");
      explanationLabel.className = "result-detail-label";
      explanationLabel.textContent = "Пояснення";
      explanation.append(explanationLabel, document.createTextNode(item.explanation));
      article.append(explanation);
    }
    const reference = document.createElement("a");
    reference.className = "mistake-reference";
    reference.href = referenceUrl(item.reference, item);
    reference.target = "_blank";
    reference.rel = "noopener";
    reference.textContent = "Відкрити розділ конспекту →";
    article.append(reference);
    elements.mistakes.append(article);
    const link = document.createElement("button");
    link.type = "button";
    link.disabled = filtered;
    link.className = `question-jump ${status}`;
    link.textContent = `${index + 1} ${answer ? (answer.correct ? "✓" : "×") : "○"}`;
    link.setAttribute("aria-label", `Питання ${index + 1}: ${label}`);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      article.style.scrollMarginTop = `${navigation.closest("nav").getBoundingClientRect().height + 24}px`;
      article.focus({ preventScroll: true });
      article.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    navigation.append(link);
  });
  $("#resultNavigationSummary").textContent =
    `Показано питань: ${visible} з ${state.questions.length}. Помилки показуються завжди.`;
  if (!visible) {
    const empty = document.createElement("p");
    empty.className = "note";
    empty.textContent =
      "За вибраними фільтрами немає питань. Увімкни показ правильних відповідей або питань без відповіді.";
    elements.mistakes.append(empty);
  }
}

function saveAttempt(percent) {
  const data = readStats();
  const date = new Date().toISOString();
  const base = {
    date,
    total: state.questions.length,
    correct: state.score,
    percent,
    grade: gradeFor(state.score, state.questions.length),
    timeMs: state.activeElapsedMs,
    prioritizeMistakes: state.settings.prioritizeMistakes,
  };
  if (!isMixed) {
    const topic = ensureTopicStats(data, config.topicIds[0], config.shortLabel);
    topic.attempts.push({ ...base, format: "Тематична" });
    if (topic.attempts.length > 100) topic.attempts = topic.attempts.slice(-100);
  } else {
    const attemptId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    data.mixedAttempts.push({
      ...base,
      attemptId,
      topicIds: config.topicIds,
      format: `Змішана · ${config.topicIds.length} тем`,
    });
    if (data.mixedAttempts.length > 100) data.mixedAttempts = data.mixedAttempts.slice(-100);
    config.topicIds.forEach((topicId) => {
      const meta = window.QUIZ_META.topics.find((item) => item.id === topicId);
      const ids = new Set(
        state.questions.filter((item) => item.sourceTopicId === topicId).map((item) => item.id),
      );
      const answers = state.answers.filter((answer) => ids.has(answer.id));
      if (!answers.length) return;
      const correct = answers.filter((answer) => answer.correct).length;
      const segmentPercent = Math.round((correct / answers.length) * 100);
      const topic = ensureTopicStats(data, topicId, meta.shortLabel);
      topic.mixedSegments.push({
        date,
        attemptId,
        total: answers.length,
        correct,
        percent: segmentPercent,
        grade: gradeFor(correct, answers.length),
        timeMs: Math.round((state.activeElapsedMs * answers.length) / state.questions.length),
        format: `Змішана · ${config.topicIds.length} тем`,
      });
      if (topic.mixedSegments.length > 100) topic.mixedSegments = topic.mixedSegments.slice(-100);
    });
  }
  data.latestResults ||= {};
  data.latestResults[config.id] = {
    version: 1,
    date,
    topicIds: [...config.topicIds],
    questions: state.questions,
    answers: state.answers,
    mistakes: state.mistakes,
    score: state.score,
    activeElapsedMs: state.activeElapsedMs,
    settings: state.settings,
    index: state.index,
  };
  writeStats(data);
}

function openLatestResult() {
  const saved = readStats().latestResults?.[config.id];
  if (!saved || saved.version !== 1 || !saved.questions?.length) {
    renderStats();
    showOnly(elements.statsPanel);
    updateViewUrl("stats");
    return;
  }
  cancelAutoAdvance();
  pauseTimer();
  saveState();
  Object.assign(state, saved, { timerStartedAt: null, questionStartedAt: null, finished: true });
  showResults(true);
}

function showResults(review = false) {
  if (state.finished && !review) return;
  cancelAutoAdvance();
  pauseTimer();
  const total = state.questions.length;
  const percent = Math.round((state.score / total) * 100);
  if (!review) saveAttempt(percent);
  state.finished = true;
  if (!review) clearSavedState();
  updateViewUrl("result");
  updateHeader();
  showOnly(elements.resultPanel);
  elements.progressBar.style.width = "100%";
  elements.bestText.textContent = `${bestAttempt()}%`;
  elements.resultCorrectTotal.textContent = `${state.score}/${total}`;
  elements.resultGrade.textContent = `${gradeFor(state.score, total)}/5`;
  elements.resultPercent.textContent = `${percent}%`;
  elements.resultTime.textContent = formatDuration(state.activeElapsedMs);
  if (percent >= 90) {
    elements.resultTitle.textContent = "Відмінна готовність";
    elements.resultMessage.textContent = "Матеріал засвоєно впевнено.";
  } else if (percent >= 75) {
    elements.resultTitle.textContent = "Добрий результат";
    elements.resultMessage.textContent = "Повтори питання з помилками й точні формулювання.";
  } else if (percent >= 60) {
    elements.resultTitle.textContent = "Основа є, потрібне повторення";
    elements.resultMessage.textContent =
      "Перечитай пов'язані фрагменти конспекту й повтори спробу.";
  } else {
    elements.resultTitle.textContent = "Тему варто пройти ще раз";
    elements.resultMessage.textContent = "Почни з екзаменаційного мінімуму та розбору помилок.";
  }
  const unanswered = state.questions.length - state.answers.length;
  if (unanswered)
    elements.resultMessage.textContent += ` Без перевіреної відповіді: ${unanswered}. Вони не зараховані в результат спроби, але не додають помилок у статистику питань.`;
  $("#showCorrectResults").checked = false;
  $("#showUnansweredResults").checked = false;
  renderMistakes();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelAutoAdvance() {
  if (autoAdvanceTimer !== null) window.clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = null;
}

function renderNavigation() {
  elements.navigation.replaceChildren();
  $(".question-navigation-legend").textContent = examActive()
    ? "● Відповідь вибрано · ○ Без відповіді. Вибір можна змінити до завершення."
    : "✓ Правильно · × Неправильно · ○ Без перевіреної відповіді";
  elements.navigationSummary.textContent = `Перевірено: ${state.answers.length} з ${state.questions.length}. Правильних: ${state.score}.`;
  if (examActive())
    elements.navigationSummary.textContent = `Відповідей вибрано: ${examAnsweredCount()} з ${state.questions.length}. Перевірка після завершення.`;
  state.questions.forEach((item, index) => {
    const answer = state.answers.find((entry) => entry.id === item.id);
    const status =
      examActive() && item.selected != null
        ? "selected-answer"
        : answer
          ? answer.correct
            ? "correct"
            : "incorrect"
          : "unanswered";
    const label =
      examActive() && item.selected != null
        ? "відповідь вибрано"
        : answer
          ? answer.correct
            ? "правильно"
            : "неправильно"
          : "без перевіреної відповіді";
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-jump ${status}`;
    button.textContent = `${index + 1} ${examActive() && item.selected != null ? "●" : answer ? (answer.correct ? "✓" : "×") : "○"}`;
    button.setAttribute("aria-label", `Питання ${index + 1}: ${label}`);
    if (index === state.index) button.setAttribute("aria-current", "step");
    button.addEventListener("click", () => goToQuestion(index));
    elements.navigation.append(button);
  });
}

function goToQuestion(index) {
  if (state.finished || index < 0 || index >= state.questions.length) return;
  cancelAutoAdvance();
  state.index = index;
  renderQuestion();
  elements.questionText.tabIndex = -1;
  elements.questionText.focus({ preventScroll: true });
}

function nextQuestion() {
  goToQuestion(state.index + 1);
}

function finishQuiz(timedOut = false, confirmed = false) {
  if (state.finished) return;
  cancelAutoAdvance();
  const exam = examActive();
  const expired = exam && (timedOut === true || currentElapsed() >= state.questions.length * 30000);
  const unanswered = state.questions.filter((item) =>
    exam ? item.selected == null : !item.checked,
  );
  const dialog = $("#finishDialog");
  if (!expired && unanswered.length && !confirmed) {
    $("#finishDialogMessage").textContent =
      `Без відповіді залишилося ${unanswered.length} з ${state.questions.length} питань. Вони не зарахуються в результат цієї спроби, але не додадуть помилок у статистику питань.`;
    if (!dialog.open) dialog.showModal();
    return;
  }
  if (dialog.open) dialog.close();
  pauseTimer();
  if (expired) state.activeElapsedMs = state.questions.length * 30000;
  if (exam) {
    state.questions.forEach((item) => {
      if (item.selected == null || item.checked) return;
      const correct = item.options[item.selected].correct;
      item.checked = true;
      state.answers.push({ id: item.id, correct, selected: item.selected });
      if (correct) state.score += 1;
      recordAnswer(item, correct);
    });
  }
  showResults();
}

function settingsFromForm() {
  return {
    examMode: elements.examMode.checked,
    count: elements.countSelect.value,
    includeMastered: elements.includeMastered.checked,
    prioritizeMistakes: elements.prioritizeMistakes.checked,
    autoAdvanceCorrect: elements.autoAdvanceCorrect.checked,
  };
}

function startQuiz(settings = settingsFromForm()) {
  updateViewUrl("quiz");
  cancelAutoAdvance();
  clearSavedState();
  state.settings = settings;
  state.questions = prepareQuestions(settings);
  state.index = 0;
  state.score = 0;
  state.selected = null;
  state.answered = false;
  state.mistakes = [];
  state.answers = [];
  state.activeElapsedMs = 0;
  state.timerStartedAt = null;
  state.questionStartedAt = null;
  state.finished = false;
  showOnly(elements.quizPanel);
  startTimer();
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSetup() {
  pauseTimer();
  showOnly(elements.setupPanel);
  updateEligibility();
  updateHeader();
}

function showResumeChoice(saved) {
  pendingSavedState = saved;
  const completed = saved.settings?.examMode
    ? saved.questions.filter((item) => item.selected != null).length
    : saved.answers.length;
  elements.resumeSummary.textContent = `Збережено питання ${saved.index + 1} з ${saved.questions.length}. Правильних: ${saved.score}; опрацьовано: ${completed}; активний час: ${formatDuration(saved.activeElapsedMs || 0)}.`;
  showOnly(elements.resumePanel);
  elements.progressText.textContent = `${saved.index + 1} / ${saved.questions.length}`;
  elements.progressBar.style.width = `${(saved.answers.length / saved.questions.length) * 100}%`;
  elements.scoreText.textContent = String(saved.score);
}

function resumeQuiz() {
  updateViewUrl("quiz");
  if (!pendingSavedState) {
    showSetup();
    return;
  }
  pendingSavedState.settings ||= {};
  pendingSavedState.settings.autoAdvanceCorrect = Boolean(
    pendingSavedState.settings.autoAdvanceCorrect,
  );
  Object.assign(state, pendingSavedState, {
    timerStartedAt: null,
    questionStartedAt: null,
    finished: false,
  });
  // Recover per-question selections from attempts saved before navigation existed.
  state.questions.forEach((item, index) => {
    const answer = state.answers.find((entry) => entry.id === item.id);
    if (answer && !item.checked) {
      const mistake = state.mistakes.find((entry) => entry.question === item.question);
      item.checked = true;
      item.selected =
        answer.selected ??
        (answer.correct
          ? item.options.findIndex((option) => option.correct)
          : item.options.findIndex((option) => option.text === mistake?.selected));
    } else if (index === state.index && item.selected === undefined) item.selected = state.selected;
  });
  pendingSavedState = null;
  showOnly(elements.quizPanel);
  startTimer();
  renderQuestion(true);
}

function updateEligibility() {
  const settings = settingsFromForm();
  const eligible = eligibleQuestions(settings).length;
  elements.eligibleHint.textContent = settings.includeMastered
    ? `Доступно ${eligible} питань.`
    : `До повторення доступно ${eligible} питань; засвоєні не включатимуться.`;
}

function makeBar(label, value, detail, href = null) {
  const row = document.createElement("div");
  row.className = "chart-row";
  const name = document.createElement(href ? "a" : "span");
  name.textContent = label;
  if (href) {
    name.className = "stats-link";
    name.href = href;
  }
  const track = document.createElement("div");
  track.className = "chart-track";
  const bar = document.createElement("div");
  bar.className = "chart-bar";
  bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
  const number = document.createElement("strong");
  number.textContent = detail;
  track.append(bar);
  row.append(name, track, number);
  return row;
}

function renderStats() {
  const data = readStats();
  const topics = Object.values(data.topics);
  const soloAttempts = topics.flatMap((topic) => topic.attempts || []);
  const attempts = [...soloAttempts, ...data.mixedAttempts];
  const selectedAttempts = (
    isMixed
      ? data.mixedAttempts.filter((item) => item.topicIds.join(",") === config.topicIds.join(","))
      : [
          ...ensureTopicStats(data, config.topicIds[0], config.shortLabel).attempts,
          ...ensureTopicStats(data, config.topicIds[0], config.shortLabel).mixedSegments,
        ]
  ).sort((a, b) => a.date.localeCompare(b.date));
  const allQuestionStats = topics.flatMap((topic) => Object.values(topic.questions || {}));
  const answeredUnique = allQuestionStats.filter((item) => item.correct + item.wrong > 0).length;
  const totalCorrect = allQuestionStats.reduce((sum, item) => sum + item.correct, 0);
  const totalAnswers = allQuestionStats.reduce((sum, item) => sum + item.correct + item.wrong, 0);
  const mastered = allQuestionStats.filter(isMastered).length;
  const totalTime = attempts.reduce((sum, item) => sum + item.timeMs, 0);
  elements.statsSummary.innerHTML = `<div><strong>${attempts.length}</strong><span>завершених спроб</span></div><div><strong>${answeredUnique}/${window.QUIZ_META.totalQuestions}</strong><span>опрацьовано питань</span></div><div><strong>${totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0}%</strong><span>загальна точність</span></div><div><strong>${mastered}</strong><span>засвоєно питань</span></div><div><strong>${formatDuration(totalTime)}</strong><span>активний час</span></div>`;
  elements.statsScope.textContent = isMixed
    ? `Поточний зріз: ${config.topicKeys.map((key) => `тема ${key}`).join(", ")}.`
    : `Поточний зріз: ${config.shortLabel}. Змішані спроби враховані окремими результатами цієї теми.`;

  elements.trendChart.replaceChildren();
  const recent = selectedAttempts.slice(-10);
  if (!recent.length)
    elements.trendChart.innerHTML =
      '<p class="empty-state">Завершені спроби для цього зрізу ще не записані.</p>';
  const latest = data.latestResults?.[config.id];
  recent.forEach((attempt, index) => {
    const available = latest && latest.date === attempt.date;
    const label = `Спроба ${selectedAttempts.length - recent.length + index + 1}${available ? " · переглянути" : ""}`;
    const url = new URL(location.href);
    url.searchParams.set("view", "result");
    const row = makeBar(label, attempt.percent, `${attempt.percent}%`, available ? url.href : null);
    if (available) row.classList.add("latest-attempt");
    elements.trendChart.append(row);
  });

  elements.topicChart.replaceChildren();
  window.QUIZ_META.topics.forEach((meta) => {
    const topic = data.topics[meta.id];
    const stats = topic ? Object.values(topic.questions || {}) : [];
    const correct = stats.reduce((sum, item) => sum + item.correct, 0);
    const answers = stats.reduce((sum, item) => sum + item.correct + item.wrong, 0);
    const accuracy = answers ? Math.round((correct / answers) * 100) : 0;
    elements.topicChart.append(
      makeBar(meta.shortLabel, accuracy, answers ? `${accuracy}%` : "-", `${meta.path}/index.html`),
    );
  });

  const rows = config.questions
    .map((item) => {
      const topic = data.topics[item.sourceTopicId];
      return { item, stat: topic && topic.questions[item.id] };
    })
    .filter((row) => row.stat);
  const hardest = rows
    .filter((row) => row.stat.wrong > 0)
    .sort(
      (a, b) =>
        b.stat.wrong / (b.stat.correct + b.stat.wrong) -
        a.stat.wrong / (a.stat.correct + a.stat.wrong),
    )
    .slice(0, 5);
  elements.hardQuestions.replaceChildren();
  if (!hardest.length)
    elements.hardQuestions.innerHTML =
      '<p class="empty-state">Питання з помилками поки відсутні.</p>';
  hardest.forEach(({ item, stat }) => {
    const accuracy = Math.round((stat.correct / (stat.correct + stat.wrong)) * 100);
    const row = document.createElement("a");
    row.className = "hard-question";
    row.href = referenceUrl(item.reference, item);
    row.innerHTML = `<span></span><strong>${accuracy}%</strong>`;
    row.firstElementChild.textContent = item.question;
    elements.hardQuestions.append(row);
  });

  elements.questionStatsBody.replaceChildren();
  config.questions.forEach((item, index) => {
    const topic = data.topics[item.sourceTopicId];
    const stat = (topic && topic.questions[item.id]) || {
      shown: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
    };
    const total = stat.correct + stat.wrong;
    const row = document.createElement("tr");
    const status = isMastered(stat) ? "Засвоєно" : total ? "В роботі" : "Нове";
    const statusClass = status === "Засвоєно" ? "mastered" : status === "Нове" ? "new" : "progress";
    const accuracy = total ? Math.round((stat.correct / total) * 100) + "%" : "-";
    const statusSymbol = status === "Засвоєно" ? "✓" : status === "В роботі" ? "◐" : "○";
    row.innerHTML = `<td class="question-number" aria-label="Питання ${index + 1}">${index + 1}</td><td class="topic-number"></td><td class="question-cell"></td><td class="metric-cell" aria-label="Спроб: ${stat.shown}"><span class="metric-glyph" aria-hidden="true">↻</span><span>${stat.shown}</span></td><td class="metric-cell" aria-label="Правильно: ${stat.correct}"><span class="metric-glyph" aria-hidden="true">✓</span><span>${stat.correct}</span></td><td class="metric-cell" aria-label="Помилки: ${stat.wrong}"><span class="metric-glyph" aria-hidden="true">×</span><span>${stat.wrong}</span></td><td class="metric-cell" aria-label="Точність: ${accuracy}"><span class="metric-glyph" aria-hidden="true">%</span><span>${accuracy}</span></td><td class="metric-cell status-cell" aria-label="Статус: ${status}"><span class="metric-glyph" aria-hidden="true">◉</span><span class="status status-${statusClass}"><span class="status-long">${status}</span><span class="status-short" aria-hidden="true">${statusSymbol}</span></span></td>`;
    const meta = window.QUIZ_META.topics.find((topicMeta) => topicMeta.id === item.sourceTopicId);
    const topicLink = document.createElement("a");
    topicLink.className = "stats-link";
    topicLink.href = `${meta.path}/index.html`;
    topicLink.title = `${meta.shortLabel}: ${meta.name}`;
    topicLink.setAttribute("aria-label", `${meta.shortLabel}: ${meta.name}`);
    topicLink.textContent = meta.key;
    const questionLink = document.createElement("a");
    questionLink.className = "stats-link";
    questionLink.href = referenceUrl(item.reference, item);
    questionLink.textContent = item.question;
    row.children[1].replaceChildren(topicLink);
    row.children[2].replaceChildren(questionLink);
    elements.questionStatsBody.append(row);
  });

  elements.historyBody.replaceChildren();
  [...selectedAttempts]
    .reverse()
    .slice(0, 20)
    .forEach((attempt) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${new Date(attempt.date).toLocaleString("uk-UA")}</td><td></td><td>${attempt.correct}/${attempt.total}</td><td>${gradeFor(attempt.correct, attempt.total)}/5</td><td>${attempt.percent}%</td><td>${formatDuration(attempt.timeMs)}</td>`;
      row.children[1].textContent = attempt.format || "Тематична";
      if (latest && latest.date === attempt.date) {
        row.classList.add("latest-attempt");
        const link = document.createElement("a");
        const url = new URL(location.href);
        url.searchParams.set("view", "result");
        link.href = url.href;
        link.className = "stats-link";
        link.textContent = `${new Date(attempt.date).toLocaleString("uk-UA")} · переглянути результат`;
        row.firstElementChild.replaceChildren(link);
      }
      elements.historyBody.append(row);
    });
  if (!selectedAttempts.length)
    elements.historyBody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Історія поки порожня.</td></tr>';
  updateResetControls(data);
}

function populateStatsResetTopics() {
  window.QUIZ_META.topics.forEach((meta) =>
    elements.statsResetTopic.add(new Option(`${meta.shortLabel}: ${meta.name}`, meta.id)),
  );
  elements.statsResetTopic.value =
    config.topicIds.length === 1
      ? config.topicIds[0]
      : config.topicIds[0] || window.QUIZ_META.topics[0].id;
  updateResetControls();
}

function populateCounts() {
  const values = [10, 15, 20, 25, 30, 40, 50, 75, 100].filter(
    (value) => value < config.questions.length,
  );
  if (!values.includes(config.defaultSize) && config.defaultSize < config.questions.length)
    values.push(config.defaultSize);
  values
    .sort((a, b) => a - b)
    .forEach((value) => elements.countSelect.add(new Option(String(value), String(value))));
  elements.countSelect.add(new Option(`Усі (${config.questions.length})`, "all"));
  elements.countSelect.value = String(config.defaultSize);
}

$("#showCorrectResults").addEventListener("change", renderMistakes);
$("#showUnansweredResults").addEventListener("change", renderMistakes);
$("#continueQuizButton").addEventListener("click", () => $("#finishDialog").close());
$("#confirmFinishButton").addEventListener("click", () => finishQuiz(false, true));
elements.finishButton.addEventListener("click", () => finishQuiz());
elements.checkButton.addEventListener("click", checkAnswer);
elements.nextButton.addEventListener("click", nextQuestion);
elements.startButton.addEventListener("click", () => startQuiz());
elements.restartButton.addEventListener("click", showSetup);
elements.resumeButton.addEventListener("click", resumeQuiz);
elements.newQuizButton.addEventListener("click", () => {
  pendingSavedState = null;
  clearSavedState();
  showSetup();
});
elements.countSelect.addEventListener("change", updateEligibility);
elements.includeMastered.addEventListener("change", updateEligibility);
elements.prioritizeMistakes.addEventListener("change", updateEligibility);
elements.autoAdvanceCorrect.addEventListener("change", updateEligibility);
elements.examMode.addEventListener("change", () => {
  elements.autoAdvanceCorrect.disabled = elements.examMode.checked;
});
elements.statsResetTopic.addEventListener("change", () => {
  elements.statsResetStatus.textContent = "";
  updateResetControls();
});
elements.clearTopicStats.addEventListener("click", clearSelectedTopicStats);
elements.clearAllStats.addEventListener("click", clearAllStatistics);

// Backups include all topics, regardless of the currently selected quiz slice.
let pendingImport = null;
const importDialog = $("#importStatsDialog");
const transferStatus = $("#statsTransferStatus");
$("#exportStats").addEventListener("click", () => {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    const text = window.QuizStatisticsBackup.serialize(
      stored ? JSON.parse(stored) : { version: 1, topics: {}, mixedAttempts: [] },
    );
    const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vos420-statistics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    transferStatus.textContent = "Файл експорту підготовлено для завантаження.";
  } catch (error) {
    transferStatus.textContent = `Експорт не виконано. ${error.message}`;
  }
});
$("#importStats").addEventListener("click", () => $("#importStatsFile").click());
$("#importStatsFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  pendingImport = null;
  try {
    if (file.size > window.QuizStatisticsBackup.MAX_BYTES)
      throw new Error("Максимальний розмір файлу — 20 МБ.");
    pendingImport = window.QuizStatisticsBackup.parse(await file.text());
    const topics = Object.values(pendingImport.topics);
    const attempts =
      topics.reduce((sum, topic) => sum + topic.attempts.length, 0) +
      pendingImport.mixedAttempts.length;
    $("#importStatsMessage").textContent =
      `Файл «${file.name}»: тем — ${topics.length}, завершених спроб — ${attempts}, збережених результатів — ${Object.keys(pendingImport.latestResults || {}).length}.`;
    transferStatus.textContent = "";
    importDialog.showModal();
  } catch (error) {
    pendingImport = null;
    transferStatus.textContent = `Імпорт не виконано. ${error.message} Поточні дані збережено.`;
  }
});
$("#cancelImportStats").addEventListener("click", () => importDialog.close());
importDialog.addEventListener("close", () => {
  pendingImport = null;
});
$("#confirmImportStats").addEventListener("click", () => {
  if (!pendingImport) return;
  try {
    // A single atomic write: quota or storage errors leave the old value intact.
    localStorage.setItem(STATS_KEY, JSON.stringify(pendingImport));
  } catch {
    transferStatus.textContent =
      "Імпорт не виконано: браузер не дозволив зберегти дані або бракує місця. Поточну статистику збережено.";
    importDialog.close();
    return;
  }
  importDialog.close();
  renderStats();
  updateEligibility();
  updateHeader();
  transferStatus.textContent =
    "Статистику всіх тем і збережені результати замінено даними з файлу.";
});
document
  .querySelectorAll("[data-view]")
  .forEach((button) =>
    button.addEventListener("click", () => activateView(button.dataset.view, true)),
  );
window.addEventListener("popstate", () => activateView(viewFromUrl()));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseTimer();
    saveState();
  } else startTimer();
});
window.addEventListener("pagehide", () => {
  pauseTimer();
  saveState();
});
document.addEventListener("keydown", (event) => {
  if (
    $("#finishDialog").open ||
    elements.quizPanel.hidden ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return;
  const target = event.target;
  if (target instanceof HTMLButtonElement && !target.classList.contains("answer-button")) return;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable
  )
    return;

  if (event.key === "Enter") {
    event.preventDefault();
    if (examActive()) {
      if (state.selected !== null && !elements.nextButton.hidden) nextQuestion();
    } else if (state.answered && !elements.nextButton.hidden) {
      nextQuestion();
    } else if (!state.answered && state.selected !== null) {
      checkAnswer();
    }
    return;
  }

  if (state.answered) return;
  const answerButtons = [...elements.answers.querySelectorAll(".answer-button")];
  if (!answerButtons.length) return;
  const focusedIndex = answerButtons.indexOf(document.activeElement);

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const startIndex = focusedIndex >= 0 ? focusedIndex : state.selected;
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      startIndex === null || startIndex < 0
        ? direction > 0
          ? 0
          : answerButtons.length - 1
        : (startIndex + direction + answerButtons.length) % answerButtons.length;
    answerButtons[nextIndex].focus();
    selectAnswer(nextIndex);
    return;
  }

  if ((event.key === " " || event.code === "Space") && focusedIndex >= 0) {
    event.preventDefault();
    selectAnswer(focusedIndex);
  }
});
setInterval(updateExamTimer, 250);
setInterval(saveState, 5000);

populateCounts();
populateStatsResetTopics();
updateEligibility();
const savedState = readSavedState();
const initialStatsView = viewFromUrl() === "stats";
if (viewFromUrl() === "result") openLatestResult();
else if (initialStatsView) {
  renderStats();
  showOnly(elements.statsPanel);
} else if (savedState) showResumeChoice(savedState);
else showSetup();
