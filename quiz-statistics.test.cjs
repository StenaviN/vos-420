const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parse, serialize } = require('./quiz-statistics.js');
const fixture = () => ({
  version: 1,
  topics: { topic10: { label: 'MOTOTRBO', attempts: [], mixedSegments: [], questions: {
    q1: { shown: 1, correct: 1, wrong: 0, streak: 1, totalTimeMs: 2300, lastCorrect: true, lastSeen: '2026-10-06T10:00:00Z' }
  } } },
  mixedAttempts: [{ date: '2026-10-06T10:00:00Z', total: 2, correct: 1, percent: 50, grade: 2.5, timeMs: 5000, format: 'Змішана', topicIds: ['topic10', 'topic9'] }],
  latestResults: { 'mixed-09-10': { version: 1, date: '2026-10-06T10:00:00Z', topicIds: ['topic10', 'topic9'], questions: [
    { id: 'q1', question: 'Питання?', explanation: 'Пояснення', sourceTopicId: 'topic10', notePath: '10-mototrbo/index.html', reference: '#purpose', options: [{ text: 'Так', correct: true }, { text: 'Ні', correct: false }] },
    { id: 'q2', question: 'Пропущене?', explanation: 'Пояснення', sourceTopicId: 'topic9', notePath: '09-tooway/index.html', reference: '#purpose', options: [{ text: 'Так', correct: true }] }
  ], answers: [{ id: 'q1', selected: 0, correct: true }], mistakes: [], score: 1, index: 1, activeElapsedMs: 5000, settings: { examMode: true } } }
});
test('round trip preserves progress, mixed attempts and full result including unanswered questions', () => {
  const data = fixture(); assert.deepEqual(parse(serialize(data)), data);
});
test('empty statistics can be exported and restored', () => {
  const data = { version: 1, topics: {}, mixedAttempts: [] }; assert.deepEqual(parse(serialize(data)), data);
});
test('rejects broken JSON, unrelated files and unsupported versions', () => {
  for (const value of ['{', '{}', JSON.stringify({ format: 'vos420-quiz-statistics', version: 2 })]) assert.throws(() => parse(value));
});
test('rejects unsafe links, counters, missing mixed topic IDs and inconsistent results', () => {
  const mutations = [
    d => { d.topics.topic10.questions.q1.shown = '<img>'; },
    d => { d.topics.topic10.questions.q1.wrong = -1; },
    d => { delete d.mixedAttempts[0].topicIds; },
    d => { d.latestResults['mixed-09-10'].questions[0].notePath = 'javascript:alert(1)'; },
    d => { d.latestResults['mixed-09-10'].answers[0].selected = 4; },
    d => { d.latestResults['mixed-09-10'].score = 2; }
  ];
  for (const mutate of mutations) { const data = fixture(); mutate(data); assert.throws(() => serialize(data)); }
});
test('rejects prototype keys in a backup', () => {
  const backup = JSON.parse(serialize(fixture()));
  backup.data.topics = JSON.parse('{"__proto__": {}}');
  assert.throws(() => parse(JSON.stringify(backup)));
});
