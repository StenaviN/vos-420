import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startServer } from "./server.mjs";
import { buildQuiz } from "./data.mjs";

test("local editing, validation, concurrent changes, generated data and access restrictions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "vos-quiz-admin-"));
  let server;
  try {
    await mkdir(path.join(root, "01-test"));
    await writeFile(
      path.join(root, "01-test/index.html"),
      '<h1>Тема</h1><section id="section"><h2>Розділ</h2><h3 id="sub">Підрозділ</h3></section>',
    );
    await writeFile(path.join(root, "index.html"), '<input value="1" data-questions="1"></body>');
    await writeFile(path.join(root, "quiz-loader.js"), "window.QUIZ_META={totalQuestions: 1};");
    await copyFile(
      new URL("../build-asset-versions.mjs", import.meta.url),
      path.join(root, "build-asset-versions.mjs"),
    );
    const q = {
      id: "t1-01",
      topic: "Категорія",
      question: "Питання?",
      correct: "hh03",
      wrong: ["HH03", "B", "C"],
      explanation: "Пояснення",
      reference: "#section",
    };
    await writeFile(
      path.join(root, "01-test/questions.json"),
      JSON.stringify({ id: "topic1", title: "Тема", questions: [q] }),
    );
    await buildQuiz(root);
    const running = await startServer(root, 0);
    server = running.server;
    const base = running.origin;
    const state = await (await fetch(base + "/api/state")).json();
    assert.equal(state.topics.length, 1);
    assert(state.notes[0].headings.some((h) => h.id === "sub"));
    const post = (body, headers = {}) =>
      fetch(base + "/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": state.token, ...headers },
        body: JSON.stringify(body),
      });
    let payload = { directory: "01-test", revision: state.topics[0].revision, questions: [q] };
    assert.equal((await post(payload, { "X-Admin-Token": "wrong" })).status, 403);
    assert.equal((await post(payload, { Origin: "https://example.com" })).status, 403);
    assert.equal((await post({ ...payload, directory: "../escape" })).status, 400);
    assert.equal(
      (await post({ ...payload, questions: [{ ...q, reference: "#missing" }] })).status,
      400,
    );
    assert.equal(
      (await post({ ...payload, questions: [{ ...q, wrong: ["B", "B", "C"] }] })).status,
      400,
    );
    assert.equal((await post({ ...payload, questions: [q, q] })).status, 400);
    assert.equal((await post({ ...payload, questions: [] })).status, 400);
    const edited = {
      ...q,
      question: "Виправлено?",
      correct: "B",
      wrong: ["hh03", "HH03", "C", "D", "E", "F", "G", "H"],
      reference: "#sub",
    };
    const added = { ...q, id: "t1-new", question: "Нове?" };
    let response = await post({ ...payload, questions: [edited, added] });
    assert.equal(response.status, 200);
    let saved = await response.json();
    assert.equal(saved.topic.data.questions[0].wrong.length, 8);
    assert.match(await readFile(path.join(root, "index.html"), "utf8"), /data-questions="2"/);
    assert.match(await readFile(path.join(root, "quiz-loader.js"), "utf8"), /totalQuestions: 2/);
    assert.match(await readFile(path.join(root, "01-test/quiz-data.js"), "utf8"), /Виправлено/);
    assert.equal((await post(payload)).status, 409);
    response = await post({ ...payload, revision: saved.topic.revision, questions: [edited] });
    assert.equal(response.status, 200);
    saved = await response.json();
    assert.equal(saved.topic.data.questions.length, 1);
    await writeFile(
      path.join(root, "01-test/questions.json"),
      JSON.stringify({ ...saved.topic.data, label: "External edit" }),
    );
    assert.equal((await post({ ...payload, revision: saved.topic.revision })).status, 409);
    assert.equal((await fetch(base + "/admin/server.mjs")).status, 403);
    assert.equal((await fetch(base + "/01-test/questions.json")).status, 403);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
