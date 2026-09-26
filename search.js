"use strict";

(() => {
  const form = document.querySelector("#searchForm");
  const input = document.querySelector("#searchInput");
  const clearButton = document.querySelector("#clearSearch");
  const status = document.querySelector("#searchStatus");
  const results = document.querySelector("#searchResults");
  const entries = window.SEARCH_INDEX?.entries || [];

  function normalize(value) {
    return value
      .toLocaleLowerCase("uk")
      .replace(/[’ʼ`]/g, "'")
      .replace(/[^\p{L}\p{N}'+-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function queryTokens(value) {
    return [...new Set(normalize(value).split(" ").filter((token) => token.length >= 2 || /^\d+$/.test(token)))];
  }

  function containsToken(value, token) {
    if (token.length > 3 && !/^\d+$/.test(token)) return value.includes(token);
    return ` ${value} `.includes(` ${token} `);
  }

  function scoreEntry(entry, tokens, phrase) {
    const topic = normalize(entry.topic);
    const section = normalize(entry.section);
    const text = normalize(entry.text);
    if (!tokens.every((token) => containsToken(topic, token) || containsToken(section, token) || containsToken(text, token))) return 0;
    let score = tokens.reduce((total, token) => total
      + (containsToken(topic, token) ? 12 : 0)
      + (containsToken(section, token) ? 8 : 0)
      + (containsToken(text, token) ? 2 : 0), 0);
    if (phrase && topic.includes(phrase)) score += 20;
    if (phrase && section.includes(phrase)) score += 14;
    if (phrase && text.includes(phrase)) score += 6;
    return score;
  }

  function snippetFor(entry, tokens) {
    const source = entry.text;
    const lower = source.toLocaleLowerCase("uk");
    const positions = tokens.map((token) => {
      if (token.length > 3 && !/^\d+$/.test(token)) return lower.indexOf(token);
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return lower.search(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u"));
    }).filter((position) => position >= 0).sort((left, right) => left - right);
    if (!positions.length) return source.slice(0, 210).trim();

    const windows = [];
    for (const position of positions) {
      const start = Math.max(0, position - 55);
      const end = Math.min(source.length, position + 105);
      const previous = windows.at(-1);
      if (previous && start <= previous.end + 20) previous.end = Math.max(previous.end, end);
      else if (windows.length < 2) windows.push({ start, end });
    }
    return windows.map(({ start, end }) => `${start ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`).join(" ");
  }

  function appendHighlighted(container, value, tokens) {
    if (!tokens.length) { container.textContent = value; return; }
    const alternatives = tokens.map((token) => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return token.length <= 3 || /^\d+$/.test(token)
        ? `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`
        : escaped;
    });
    const pattern = new RegExp(`(${alternatives.join("|")})`, "giu");
    value.split(pattern).forEach((part) => {
      if (!part) return;
      if (tokens.some((token) => normalize(part) === token)) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        container.append(mark);
      } else container.append(document.createTextNode(part));
    });
  }

  function render() {
    const query = input.value.trim();
    const tokens = queryTokens(query);
    results.replaceChildren();
    form.classList.toggle("has-query", Boolean(query));
    clearButton.hidden = !query;

    if (!query) {
      status.textContent = `Проіндексовано ${entries.length} розділів.`;
      return;
    }
    if (!tokens.length) {
      status.textContent = "Введи щонайменше два символи.";
      return;
    }

    const phrase = normalize(query);
    const matches = entries
      .map((entry) => ({ entry, score: scoreEntry(entry, tokens, phrase) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.entry.topic.localeCompare(right.entry.topic, "uk"));

    status.textContent = matches.length
      ? `Знайдено: ${matches.length}`
      : "Нічого не знайдено. Спробуй коротший або точніший запит.";

    matches.slice(0, 50).forEach(({ entry }) => {
      const link = document.createElement("a");
      link.className = "search-result";
      const [path, hash] = entry.url.split("#");
      link.href = `${path}?search=${encodeURIComponent(query)}${hash ? `#${hash}` : ""}`;
      const heading = document.createElement("strong");
      heading.textContent = entry.section;
      const topic = document.createElement("span");
      topic.className = "search-result-topic";
      topic.textContent = entry.topic;
      const snippet = document.createElement("span");
      snippet.className = "search-result-snippet";
      appendHighlighted(snippet, snippetFor(entry, tokens), tokens);
      link.append(heading, topic, snippet);
      results.append(link);
    });
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); render(); });
  input.addEventListener("input", render);
  clearButton.addEventListener("click", () => { input.value = ""; render(); input.focus(); });
  render();
})();
