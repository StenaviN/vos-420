"use strict";

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
    const questions = loaded.flatMap(({ meta, config }) =>
      config.questions.map((item, questionIndex) => ({
        ...item,
        id: item.id || `t${meta.key}-${String(questionIndex + 1).padStart(2, "0")}`,
        sourceTopicId: meta.id,
        sourceTopicLabel: meta.shortLabel,
        notePath: item.notePath || `${meta.path}/index.html`,
        topic: isMixed ? `${meta.shortLabel} · ${item.topic}` : item.topic,
      })),
    );
    const first = loaded[0];
    window.QUIZ_CONFIG = isMixed
      ? {
          id: `mixed-${selectedMeta.map((item) => item.key).join("-")}`,
          label: `ВОС-420 · ${selectedMeta.length} тем у добірці`,
          title: "Глобальний зріз знань",
          shortLabel: "Змішана спроба",
          topicIds: selectedMeta.map((item) => item.id),
          topicKeys: selectedMeta.map((item) => item.key),
          defaultSize: Math.min(50, questions.length),
          notePath: first.meta.path + "/index.html",
          questions,
        }
      : {
          ...first.config,
          title: first.meta.name,
          shortLabel: first.meta.shortLabel,
          topicIds: [first.meta.id],
          topicKeys: [first.meta.key],
          defaultSize: first.meta.defaultSize,
          notePath: first.meta.path + "/index.html",
          questions,
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
