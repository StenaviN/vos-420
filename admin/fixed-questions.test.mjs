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
    data.questions.reduce((n, q) => n + q.wrong.length + 1, 0),
    169,
  );
  assert(data.showAllOptions);
  assert(data.questions[31].correct.includes("Постійна готовність"));
  assert(data.questions[31].correct.includes("Своєчасність, достовірність, безпека"));
  for (const q of data.questions) {
    assert(!("correctPosition" in q));
    for (const answer of [q.correct, ...q.wrong]) {
      assert(!/^\d+\./.test(answer));
      assert(!/пункти?\s*\d|вс[еі] перерахован|перелічене в пунктах/i.test(answer));
    }
  }
  assert.match(data.questions[27].question, /^26\./, "preserve source numbering");
  data.questions[0].wrong = [];
  assert.throws(() => validate(data, "13-tsp-theory", []));
});
