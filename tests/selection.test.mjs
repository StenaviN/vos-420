import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const questions = readdirSync(new URL("themes/", root)).flatMap((directory) => {
  let bank;
  try {
    bank = JSON.parse(readFileSync(new URL(`themes/${directory}/questions.json`, root), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return bank.questions.map((q) => ({
    ...q,
    sourceTopicId: bank.id,
    sourceTopicLabel: bank.title,
    showAllOptions: bank.showAllOptions,
  }));
});
export function prepareHarness(sourcePath = new URL("quiz-engine/engine.js", root)) {
  const source = readFileSync(sourcePath, "utf8");
  const slice = (start, end) =>
    source.slice(source.indexOf(`function ${start}(`), source.indexOf(`function ${end}(`));
  const stats = { version: 1, topics: {}, mixedAttempts: [] };
  for (const q of questions) {
    stats.topics[q.sourceTopicId] ||= { questions: {} };
    stats.topics[q.sourceTopicId].questions[q.id] = { correct: 1, wrong: 2, streak: 0 };
  }
  const storage = new Map([["stats", JSON.stringify(stats)]]);
  const calls = { reads: 0, writes: 0 };
  const context = vm.createContext({
    config: { questions, topicIds: Object.keys(stats.topics) },
    isMixed: true,
    STATS_KEY: "stats",
    DISTRACTOR_HISTORY_KEY: "history",
    localStorage: {
      getItem(key) {
        calls.reads++;
        return storage.get(key) || null;
      },
      setItem(key, value) {
        calls.writes++;
        storage.set(key, value);
      },
    },
  });
  vm.runInContext(
    slice("shuffled", "formatDuration") +
      slice("readStats", "writeStats") +
      slice("ensureTopicStats", "topicHasStats") +
      slice("questionStat", "currentElapsed"),
    context,
  );
  return {
    context,
    calls,
    run(settings) {
      context.settings = settings;
      return vm.runInContext("prepareQuestions(settings)", context);
    },
  };
}

test("large attempts read statistics/history once and write history once", () => {
  const h = prepareHarness();
  const result = h.run({ count: "all", includeMastered: false, prioritizeMistakes: true });
  assert.equal(result.length, questions.length);
  assert.equal(new Set(result.map((q) => q.id)).size, questions.length);
  assert.equal(h.calls.reads, 2);
  assert.equal(h.calls.writes, 1);
  for (const q of result) {
    assert.equal(q.options.filter((o) => o.correct).length, 1);
    assert.equal(
      q.options.length,
      q.showAllOptions ? q.wrong.length + 1 : Math.min(3, q.wrong.length) + 1,
    );
  }
});
test("mixed selection keeps topic coverage with and without prioritization", () => {
  for (const prioritizeMistakes of [true, false]) {
    const h = prepareHarness();
    const result = h.run({ count: 50, includeMastered: true, prioritizeMistakes });
    assert.equal(result.length, 50);
    assert.equal(new Set(result.map((q) => q.id)).size, 50);
    assert.equal(
      new Set(result.map((q) => q.sourceTopicId)).size,
      new Set(questions.map((q) => q.sourceTopicId)).size,
    );
  }
});
