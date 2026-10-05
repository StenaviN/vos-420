const $ = (id) => document.getElementById(id);
let state,
  editing,
  original,
  saving = false,
  chosen;
const el = (tag, text, className) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
};
function status(text, error = false) {
  $("status").textContent = text;
  $("status").className = error ? "error" : "success";
}
async function api(url, body) {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Token": state.token },
          body: JSON.stringify(body),
        }
      : {},
  );
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Не вдалося виконати запит.");
  return data;
}
function options(select, items) {
  select.replaceChildren(
    ...items.map(([value, text]) => {
      const o = el("option", text);
      o.value = value;
      return o;
    }),
  );
}
function render() {
  const filter = $("topicFilter").value,
    query = $("search").value.trim().toLocaleLowerCase("uk");
  let count = 0;
  $("questions").replaceChildren();
  for (const topic of state.topics) {
    if (filter && topic.directory !== filter) continue;
    topic.data.questions.forEach((q, index) => {
      if (query && !JSON.stringify(q).toLocaleLowerCase("uk").includes(query)) return;
      count++;
      const card = el("article", undefined, "question-card");
      card.append(
        el("p", `${topic.data.label} · №${index + 1} · ${q.id}`, "card-meta"),
        el("h2", q.question),
        el("p", q.topic, "card-meta"),
      );
      const list = el("ol");
      list.append(el("li", `✓ ${q.correct}`, "right-answer"));
      q.wrong.forEach((a) => list.append(el("li", a)));
      card.append(list, el("p", q.explanation, "explanation"));
      if (q.wrong.length < 6)
        card.append(
          el(
            "p",
            `Пул: ${q.wrong.length} неправильних відповідей. Рекомендовано щонайменше 6.`,
            "warning",
          ),
        );
      const footer = el("footer"),
        link = el("a", "Відкрити фрагмент конспекту ↗");
      link.href = "/" + (q.notePath || topic.directory + "/index.html") + q.reference;
      link.target = "_blank";
      link.rel = "noopener";
      const edit = el("button", "Редагувати");
      edit.onclick = () => openEditor(topic, q);
      footer.append(link, edit);
      card.append(footer);
      $("questions").append(card);
    });
  }
  $("count").textContent =
    `Показано питань: ${count}. ✓ — правильна відповідь; показано весь пул варіантів.`;
}
function confirmAction(title, text) {
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = text;
  return new Promise((resolve) => {
    const finish = (value) => {
      $("confirm").close();
      resolve(value);
    };
    $("confirmYes").onclick = () => finish(true);
    $("confirmNo").onclick = () => finish(false);
    $("confirm").oncancel = (e) => {
      e.preventDefault();
      finish(false);
    };
    $("confirm").showModal();
  });
}
function addAnswer(text = "", correct = false) {
  const row = el("div", undefined, "answer-row"),
    radio = el("input");
  radio.type = "radio";
  radio.name = "correctAnswer";
  radio.checked = correct;
  radio.required = true;
  radio.setAttribute("aria-label", "Правильна відповідь");
  const input = el("textarea");
  input.rows = 2;
  input.value = text;
  input.required = true;
  input.setAttribute("aria-label", "Текст варіанта відповіді");
  const remove = el("button", "Видалити");
  remove.type = "button";
  remove.onclick = () => {
    if (radio.checked) {
      $("formError").textContent = "Спочатку позначте іншу правильну відповідь.";
      return;
    }
    row.remove();
    poolHint();
  };
  row.append(radio, input, remove);
  $("answers").append(row);
  poolHint();
}
function poolHint() {
  const n = $("answers").children.length - 1;
  $("poolHint").textContent =
    `Неправильних варіантів: ${n}. ${n < 6 ? "Рекомендовано щонайменше 6." : ""}`;
  $("poolHint").className = n < 6 ? "warning" : "";
}
function normalizeReference(value) {
  const base = new URL("/", location.href),
    url = new URL(value, base);
  // Pasted links from another local preview or the published site are mapped only to known notes.
  const note = state.notes.find((n) => url.pathname.endsWith("/" + n.path));
  const reference = decodeURIComponent(url.hash);
  if (!note || !note.headings.some((h) => "#" + h.id === reference))
    throw Error("Посилання не відповідає наявному розділу конспекту. Оберіть фрагмент зі списку.");
  return { notePath: note.path, reference };
}
function referencePreview() {
  try {
    const r = normalizeReference($("reference").value);
    $("referencePreview").href = "/" + r.notePath + r.reference;
  } catch {
    $("referencePreview").removeAttribute("href");
  }
}
function draft() {
  const rows = [...$("answers").children],
    selected = rows.find((r) => r.querySelector("input").checked);
  return {
    id: editing.id,
    topic: $("category").value.trim(),
    question: $("question").value.trim(),
    correct: selected?.querySelector("textarea").value.trim() || "",
    wrong: rows.filter((r) => r !== selected).map((r) => r.querySelector("textarea").value.trim()),
    explanation: $("explanation").value.trim(),
    rawReference: $("reference").value,
    topicDirectory: $("editTopic").value,
  };
}
function dirty() {
  return editing && JSON.stringify(draft()) !== original;
}
function openEditor(topic, q) {
  editing = {
    directory: topic.directory,
    id: q?.id || `t${Number(topic.directory.slice(0, 2))}-${crypto.randomUUID()}`,
    isNew: !q,
  };
  $("editTopic").value = topic.directory;
  $("editTopic").disabled = !!q;
  $("editId").textContent = editing.id;
  $("editTitle").textContent = q ? "Редагування питання" : "Нове питання";
  $("category").value = q?.topic || "";
  $("question").value = q?.question || "";
  $("explanation").value = q?.explanation || "";
  $("reference").value = q ? (q.notePath || topic.directory + "/index.html") + q.reference : "";
  $("answers").replaceChildren();
  addAnswer(q?.correct || "", true);
  (q?.wrong || Array(6).fill("")).forEach((a) => addAnswer(a));
  $("deleteQuestion").hidden = !q;
  $("formError").textContent = "";
  referencePreview();
  original = JSON.stringify(draft());
  $("editor").showModal();
}
async function closeEditor() {
  if (saving) return;
  if (dirty() && !(await confirmAction("Скасувати зміни?", "Незбережені правки буде втрачено.")))
    return;
  $("editor").close();
  editing = null;
}
async function persist(questions, topic) {
  saving = true;
  $("editForm").inert = true;
  $("save").disabled = true;
  $("deleteQuestion").disabled = true;
  $("formError").textContent = "Збереження…";
  try {
    const result = await api("/api/save", {
      directory: topic.directory,
      revision: topic.revision,
      questions,
    });
    state.topics[state.topics.indexOf(topic)] = result.topic;
    editing = null;
    $("editor").close();
    render();
    status(
      "Збережено у файли проєкту. Вікторини оновлено; коміт можна зробити після завершення правок.",
    );
  } catch (e) {
    $("formError").textContent = e.message;
  } finally {
    saving = false;
    $("editForm").inert = false;
    $("save").disabled = false;
    $("deleteQuestion").disabled = false;
  }
}
$("editForm").onsubmit = async (e) => {
  e.preventDefault();
  if (saving) return;
  try {
    const { rawReference, topicDirectory, ...q } = draft();
    Object.assign(q, normalizeReference(rawReference));
    const topic = state.topics.find((t) => t.directory === topicDirectory);
    const qs = topic.data.questions.map((item) => (item.id === q.id ? q : item));
    if (editing.isNew) qs.push(q);
    await persist(qs, topic);
  } catch (err) {
    $("formError").textContent = err.message;
  }
};
$("deleteQuestion").onclick = async () => {
  if (saving) return;
  if (
    !(await confirmAction(
      "Видалити питання?",
      "Воно більше не потраплятиме у нові вікторини. Збережені результати минулих спроб залишаться.",
    ))
  )
    return;
  const topic = state.topics.find((t) => t.directory === editing.directory);
  await persist(
    topic.data.questions.filter((q) => q.id !== editing.id),
    topic,
  );
};
$("cancelEdit").onclick = $("closeEdit").onclick = closeEditor;
$("editor").oncancel = (e) => {
  e.preventDefault();
  closeEditor();
};
window.addEventListener("beforeunload", (e) => {
  if (saving || dirty()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
$("addAnswer").onclick = () => addAnswer();
$("reference").oninput = referencePreview;
function renderAnchors() {
  const note = state.notes.find((n) => n.path === $("noteSelect").value),
    query = $("anchorSearch").value.toLocaleLowerCase("uk");
  $("anchorList").replaceChildren();
  for (const h of note.headings) {
    if (!`${h.title} ${h.id}`.toLocaleLowerCase("uk").includes(query)) continue;
    const button = el("button", h.title, h.level === 3 ? "subheading" : "");
    button.type = "button";
    button.setAttribute("aria-pressed", String(chosen?.path === note.path && chosen?.id === h.id));
    button.onclick = () => {
      resetSelection();
      chosen = { path: note.path, id: h.id };
      $("notePreview").src = "/" + note.path + "#" + h.id;
      $("anchorChosen").textContent = h.title;
      $("useAnchor").disabled = false;
      renderAnchors();
    };
    $("anchorList").append(button);
  }
}
$("chooseAnchor").onclick = () => {
  resetSelection();
  chosen = null;
  $("useAnchor").disabled = true;
  $("anchorChosen").textContent = "";
  $("anchorSearch").value = "";
  $("notePreview").removeAttribute("src");
  let note = editing.directory + "/index.html";
  try {
    note = normalizeReference($("reference").value).notePath;
  } catch {}
  $("noteSelect").value = note;
  renderAnchors();
  $("picker").showModal();
};
$("noteSelect").onchange = () => {
  resetSelection();
  chosen = null;
  $("useAnchor").disabled = true;
  $("anchorChosen").textContent = "";
  $("notePreview").removeAttribute("src");
  renderAnchors();
};
$("anchorSearch").oninput = renderAnchors;
$("closePicker").onclick = () => $("picker").close();
$("useAnchor").onclick = () => {
  if (!chosen) return;
  $("reference").value = chosen.path + "#" + chosen.id;
  referencePreview();
  $("picker").close();
};
$("topicFilter").onchange = render;
$("search").oninput = render;
$("create").onclick = () =>
  openEditor(state.topics.find((t) => t.directory === $("topicFilter").value) || state.topics[0]);
try {
  if (!["127.0.0.1", "localhost", "[::1]"].includes(location.hostname))
    throw Error("Редактор працює лише локально. Запустіть npm run quiz:admin у каталозі проєкту.");
  state = await api("/api/state");
  options($("topicFilter"), [
    ["", "Усі теми"],
    ...state.topics.map((t) => [t.directory, t.data.label]),
  ]);
  options(
    $("editTopic"),
    state.topics.map((t) => [t.directory, t.data.label]),
  );
  options(
    $("noteSelect"),
    state.notes.map((n) => [n.path, n.title]),
  );
  $("workspace").hidden = false;
  render();
  status("Локальний доступ активний. Зміни зберігаються тільки після натискання «Зберегти».");
} catch {
  status(
    "Редактор недоступний. У каталозі проєкту запустіть npm run quiz:admin та відкрийте адресу, яку покаже термінал.",
    true,
  );
}

$("notePreview").addEventListener("load", () => {
  if (!chosen) return;
  const frame = $("notePreview").contentWindow;
  frame.dispatchEvent(new Event("hashchange"));
  frame.document.getElementById(chosen.id)?.scrollIntoView({ block: "start" });
  frame.document.addEventListener("selectionchange", captureSelection);
  frame.document.addEventListener("mouseup", captureSelection);
});

let selectedExcerpt = "";
function resetSelection(
  message = "Виділіть мишкою текст у вибраному розділі, щоб використати його як пояснення.",
) {
  selectedExcerpt = "";
  $("useSelection").disabled = true;
  $("selectedExcerpt").hidden = true;
  $("selectedExcerpt").textContent = "";
  $("selectionHint").textContent = message;
}
function captureSelection() {
  if (!chosen) return;
  const frame = $("notePreview").contentWindow;
  if (frame.location.pathname !== "/" + chosen.path) return resetSelection();
  const selection = frame.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return resetSelection();
  const target = frame.document.getElementById(chosen.id);
  if (!target) return resetSelection();
  const scope = frame.document.createRange();
  scope.selectNodeContents(target);
  if (/^H[1-6]$/.test(target.tagName)) {
    scope.setStartBefore(target);
    const section = target.closest("section") || target.parentElement;
    const next = [...section.querySelectorAll("h1,h2,h3,h4,h5,h6")].find(
      (h) =>
        target.compareDocumentPosition(h) & 4 && Number(h.tagName[1]) <= Number(target.tagName[1]),
    );
    if (next) scope.setEndBefore(next);
    else scope.setEnd(section, section.childNodes.length);
  }
  const range = selection.getRangeAt(0);
  if (range.compareBoundaryPoints(0, scope) < 0 || range.compareBoundaryPoints(2, scope) > 0) {
    return resetSelection(
      "Виділіть текст у вибраному розділі. Для іншого фрагмента спочатку оберіть відповідний розділ ліворуч.",
    );
  }
  const text = selection.toString().replace(/\r\n/g, "\n").trim();
  if (!text) return resetSelection();
  selectedExcerpt = text;
  $("selectedExcerpt").textContent = text;
  $("selectedExcerpt").hidden = false;
  $("selectionHint").textContent =
    `Виділено символів: ${text.length}. Текст і посилання на цей розділ буде перенесено у форму; збереження — кнопкою «Зберегти».`;
  $("useSelection").disabled = false;
}
function excerptMode() {
  return new Promise((resolve) => {
    const finish = (mode) => {
      $("excerptAction").close();
      resolve(mode);
    };
    $("excerptCancel").onclick = () => finish(null);
    $("excerptReplace").onclick = () => finish("replace");
    $("excerptAppend").onclick = () => finish("append");
    $("excerptAction").oncancel = (e) => {
      e.preventDefault();
      finish(null);
    };
    $("excerptAction").showModal();
  });
}
$("useSelection").addEventListener("mousedown", (e) => e.preventDefault());
$("useSelection").onclick = async () => {
  if (!selectedExcerpt || !chosen) return;
  const text = selectedExcerpt,
    reference = chosen.path + "#" + chosen.id;
  const previous = $("explanation").value;
  const mode = previous.trim() ? await excerptMode() : "replace";
  if (!mode) return;
  $("explanation").value = mode === "append" ? previous.trimEnd() + "\n\n" + text : text;
  $("reference").value = reference;
  referencePreview();
  $("picker").close();
  $("explanation").focus();
};
