import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { catalog, validate } from "../admin/data.mjs";

test("TSP bank keeps all options and validates both linked and unsupported questions", async () => {
  const data = JSON.parse(
    await readFile(new URL("../themes/13-tsp-theory/questions.json", import.meta.url), "utf8"),
  );
  const notes = await catalog(fileURLToPath(new URL("../", import.meta.url)));
  validate(data, "13-tsp-theory", notes);
  assert.equal(data.questions.length, 50);
  assert.equal(
    data.questions.reduce((n, q) => n + q.wrong.length + 1, 0),
    169,
  );
  assert(data.showAllOptions);
  assert(data.allowNoNotes);
  const supportedIds = [2, 11, 14, 15, 18, 25, 30, 31, 35, 38].map(
    (number) => `t13-${String(number).padStart(3, "0")}`,
  );
  assert.deepEqual(
    data.questions.filter((q) => q.reference).map((q) => q.id),
    supportedIds,
  );
  for (const q of data.questions) {
    assert(!("correctPosition" in q));
    if (q.reference) {
      assert(q.explanation);
      assert.equal(q.notePath, "themes/13-tsp-theory/index.html");
    } else {
      assert.equal(q.notePath, "");
    }
  }
  const brokenLink = structuredClone(data);
  brokenLink.questions[1].reference = "#missing-section";
  assert.throws(() => validate(brokenLink, "13-tsp-theory", notes));
  data.questions[0].wrong = [];
  assert.throws(() => validate(data, "13-tsp-theory", notes));
});
