import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validate } from "./data.mjs";

test("source bank keeps 50 questions, 169 options and the combined answer for question 32", async () => {
  const data = JSON.parse(
    await readFile(new URL("../13-tsp-theory/questions.json", import.meta.url), "utf8"),
  );
  validate(data, "13-tsp-theory", []);
  assert.equal(data.questions.length, 50);
  assert.equal(
    data.questions.reduce((n, q) => n + q.options.length, 0),
    169,
  );
  assert.deepEqual(data.questions[31].acceptedAnswers, [3]);
  assert.equal(data.questions[43].acceptedAnswers.length, 1, "red whitespace is not an answer");
  assert.match(data.questions[27].question, /^26\./, "preserve source numbering");
  data.questions[0].acceptedAnswers = [99];
  assert.throws(() => validate(data, "13-tsp-theory", []));
});
