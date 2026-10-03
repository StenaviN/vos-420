"use strict";

window.QUIZ_META = {
  totalQuestions: 413,
  topics: [
    { key: "1", id: "topic1-basics", shortLabel: "Тема 1", name: "Основи радіозв'язку", path: "01-osnovy-radiozviazku", defaultSize: 25 },
    { key: "2", id: "topic2-safety", shortLabel: "Тема 2", name: "Техніка безпеки", path: "02-tehnika-bezpeky", defaultSize: 20 },
    { key: "3", id: "topic3-waves", shortLabel: "Тема 3", name: "Радіохвилі та завади", path: "03-radiohvyli-radiozviazok-zavady", defaultSize: 25 },
    { key: "4", id: "topic4-radio-antennas", shortLabel: "Тема 4", name: "Радіостанції та антени", path: "04-pobudova-radiostantsii-antenny", defaultSize: 25 },
    { key: "5", id: "topic5-harris", shortLabel: "Тема 5", name: "HARRIS RF-7850M-HH", path: "05-harris-ukh", defaultSize: 30 },
    { key: "6", id: "topic6-harris-hf", shortLabel: "Тема 6", name: "HARRIS КХ RF-7800H-MP / MPR-9600-MP", path: "06-harris-kh", defaultSize: 30 },
    { key: "7", id: "topic7-harris-hf-operation", shortLabel: "Тема 7", name: "Експлуатація HARRIS КХ", path: "07-harris-kh-ekspluatatsiia", defaultSize: 25 },
    { key: "9", id: "topic9-tooway", shortLabel: "Тема 9", name: "TOOWAY", path: "09-tooway", defaultSize: 25 }
  ]
};

const params = new URLSearchParams(location.search);
const requestedKeys = (params.get("topics") || params.get("topic") || "1")
  .split(",")
  .filter((key, index, items) => /^\d+$/.test(key) && items.indexOf(key) === index);
const selectedMeta = window.QUIZ_META.topics.filter((item) => requestedKeys.includes(item.key));
if (!selectedMeta.length) selectedMeta.push(window.QUIZ_META.topics[0]);

document.querySelectorAll("[data-topic-link]").forEach((link) => {
  const item = window.QUIZ_META.topics.find((topic) => topic.key === link.dataset.topicLink);
  link.href = `quiz.html?topic=${item.key}`;
  link.classList.toggle("active", selectedMeta.length === 1 && item.key === selectedMeta[0].key);
});

const loaded = [];
function versionedAsset(source) {
  if (!window.ASSET_VERSION) return source;
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}v=${encodeURIComponent(window.ASSET_VERSION)}`;
}

function loadTopic(index) {
  if (index >= selectedMeta.length) {
    const isMixed = loaded.length > 1;
    const questions = loaded.flatMap(({ meta, config }) => config.questions.map((item, questionIndex) => ({
      ...item,
      id: item.id || `t${meta.key}-${String(questionIndex + 1).padStart(2, "0")}`,
      sourceTopicId: meta.id,
      sourceTopicLabel: meta.shortLabel,
      notePath: `${meta.path}/index.html`,
      topic: isMixed ? `${meta.shortLabel} · ${item.topic}` : item.topic
    })));
    const first = loaded[0];
    window.QUIZ_CONFIG = isMixed ? {
      id: `mixed-${selectedMeta.map((item) => item.key).join("-")}`,
      label: `ВОС-420 · ${selectedMeta.length} тем у добірці`,
      title: "Глобальний зріз знань",
      shortLabel: "Змішана спроба",
      topicIds: selectedMeta.map((item) => item.id),
      topicKeys: selectedMeta.map((item) => item.key),
      defaultSize: Math.min(50, questions.length),
      notePath: first.meta.path + "/index.html",
      questions
    } : {
      ...first.config,
      shortLabel: first.meta.shortLabel,
      topicIds: [first.meta.id],
      topicKeys: [first.meta.key],
      defaultSize: first.meta.defaultSize,
      notePath: first.meta.path + "/index.html",
      questions
    };
    const engine = document.createElement("script");
    engine.src = versionedAsset("quiz-engine.js");
    document.body.append(engine);
    return;
  }

  const meta = selectedMeta[index];
  const script = document.createElement("script");
  script.src = versionedAsset(`${meta.path}/quiz-data.js`);
  script.addEventListener("load", () => {
    loaded.push({ meta, config: window.QUIZ_CONFIG });
    window.QUIZ_CONFIG = null;
    loadTopic(index + 1);
  });
  document.body.append(script);
}

loadTopic(0);
