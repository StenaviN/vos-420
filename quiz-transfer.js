"use strict";
window.initQuizTransfer = function (onImport = () => {}) {
  const $ = (selector) => document.querySelector(selector);
  const STATS_KEY = "vos420-quiz-statistics-v1";
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
    onImport();
    transferStatus.textContent =
      "Статистику всіх тем і збережені результати замінено даними з файлу.";
  });
};
