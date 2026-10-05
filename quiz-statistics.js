/* Shared by the browser and the backup validation tests. */
(function (root) {
  "use strict";
  const MAX_BYTES = 20 * 1024 * 1024;
  const fail = () => { throw new Error("Файл містить некоректні або несумісні дані статистики."); };
  const object = value => { if (!value || typeof value !== "object" || Array.isArray(value)) fail(); };
  const array = value => { if (!Array.isArray(value) || value.length > 10000) fail(); };
  const string = value => { if (typeof value !== "string" || value.length > 100000) fail(); };
  const number = value => { if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) fail(); };
  const integer = value => { number(value); if (!Number.isInteger(value)) fail(); };
  const date = value => { string(value); if (!Number.isFinite(Date.parse(value))) fail(); };
  const boolean = value => { if (typeof value !== "boolean") fail(); };
  function safe(value, depth = 0) {
    if (depth > 30) fail();
    if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) fail();
      safe(child, depth + 1);
    }
  }
  function attempt(value) {
    object(value); date(value.date);
    ["total", "correct"].forEach(key => integer(value[key]));
    ["percent", "grade", "timeMs"].forEach(key => number(value[key]));
    string(value.format);
    if (value.correct > value.total || value.percent > 100 || value.grade > 5) fail();
    if (value.topicIds !== undefined) { array(value.topicIds); value.topicIds.forEach(string); }
  }
  function validate(data) {
    object(data); safe(data);
    if (data.version !== 1) fail();
    object(data.topics); array(data.mixedAttempts);
    data.mixedAttempts.forEach(value => { attempt(value); array(value.topicIds); value.topicIds.forEach(string); });
    for (const topic of Object.values(data.topics)) {
      object(topic); string(topic.label); object(topic.questions);
      for (const key of ["attempts", "mixedSegments"]) { array(topic[key]); topic[key].forEach(attempt); }
      for (const stat of Object.values(topic.questions)) {
        object(stat);
        ["shown", "correct", "wrong", "streak"].forEach(key => integer(stat[key]));
        number(stat.totalTimeMs);
        if (stat.lastSeen !== undefined) date(stat.lastSeen);
        if (stat.lastCorrect !== undefined) boolean(stat.lastCorrect);
      }
    }
    if (data.latestResults !== undefined) {
      object(data.latestResults);
      for (const saved of Object.values(data.latestResults)) {
        object(saved);
        if (saved.version !== 1) fail();
        date(saved.date); array(saved.topicIds); saved.topicIds.forEach(string);
        array(saved.questions); array(saved.answers); array(saved.mistakes); object(saved.settings);
        integer(saved.score); integer(saved.index); number(saved.activeElapsedMs);
        if (!saved.questions.length || saved.index >= saved.questions.length) fail();
        const ids = new Map();
        for (const question of saved.questions) {
          object(question);
          ["id", "question", "explanation", "sourceTopicId", "reference", "notePath"].forEach(key => string(question[key]));
          // Only local note links may be restored from an external file.
          if (!/^\d{2}-[a-z0-9-]+\/index\.html$/.test(question.notePath) || !/^#[a-zA-Z0-9_-]+$/.test(question.reference)) fail();
          if (ids.has(question.id)) fail();
          ids.set(question.id, question);
          array(question.options);
          question.options.forEach(option => { object(option); string(option.text); boolean(option.correct); });
          if (question.options.filter(option => option.correct).length !== 1) fail();
        }
        const answered = new Set();
        for (const answer of saved.answers) {
          object(answer); string(answer.id); boolean(answer.correct); integer(answer.selected);
          const question = ids.get(answer.id);
          if (!question || answered.has(answer.id) || !question.options[answer.selected] || question.options[answer.selected].correct !== answer.correct) fail();
          answered.add(answer.id);
        }
        if (saved.score !== saved.answers.filter(answer => answer.correct).length) fail();
      }
    }
    return data;
  }
  function parse(text) {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("Файл завеликий. Максимальний розмір — 20 МБ.");
    let backup;
    try { backup = JSON.parse(text); } catch { throw new Error("Не вдалося прочитати JSON. Вибери файл експорту статистики."); }
    object(backup);
    if (backup.format !== "vos420-quiz-statistics" || backup.version !== 1) fail();
    date(backup.exportedAt);
    return validate(backup.data);
  }
  function serialize(data) {
    validate(data);
    const text = JSON.stringify({ format: "vos420-quiz-statistics", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("Обсяг статистики перевищує 20 МБ.");
    return text;
  }
  const api = { MAX_BYTES, parse, serialize };
  if (typeof module !== "undefined") module.exports = api;
  else root.QuizStatisticsBackup = api;
})(globalThis);
