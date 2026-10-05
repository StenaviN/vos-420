"use strict";

(() => {
  const hero = document.querySelector(".hero");
  const allEntries = window.SEARCH_INDEX?.entries || [];
  const pathParts = location.pathname.split("/").filter(Boolean);
  const topicDirectory = pathParts.at(-2);
  if (!hero || !topicDirectory || !allEntries.length) return;

  const topicPrefix = `${decodeURIComponent(topicDirectory)}/index.html`;
  const entries = allEntries.filter(
    (entry) => decodeURIComponent(entry.url).split("#")[0] === topicPrefix,
  );
  if (!entries.length) return;

  const panel = document.createElement("section");
  panel.className = "topic-search-panel";
  panel.setAttribute("aria-label", "Пошук у цій темі");
  panel.innerHTML = `
    <form class="topic-search-form" role="search">
      <label class="visually-hidden" for="topicSearchInput">Пошук у цій темі</label>
      <input id="topicSearchInput" type="search" inputmode="search" autocomplete="off" placeholder="Пошук у цій темі">
      <button class="topic-search-clear" type="button" title="Очистити пошук" aria-label="Очистити пошук" hidden>×</button>
      <button class="topic-search-submit" type="submit">Знайти</button>
    </form>
    <p class="topic-search-status" aria-live="polite"></p>
    <div class="topic-search-results"></div>`;
  hero.after(panel);

  const form = panel.querySelector("form");
  const input = panel.querySelector("input");
  const clearButton = panel.querySelector(".topic-search-clear");
  const status = panel.querySelector(".topic-search-status");
  const results = panel.querySelector(".topic-search-results");

  function normalize(value) {
    return String(value)
      .toLocaleLowerCase("uk")
      .replace(/[’ʼ`]/g, "'")
      .replace(/[^\p{L}\p{N}'+-]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function queryTokens(value) {
    return [
      ...new Set(
        normalize(value)
          .split(" ")
          .filter((token) => token.length >= 2 || /^\d+$/.test(token)),
      ),
    ];
  }

  function containsToken(value, token) {
    if (token.length > 3 && !/^\d+$/.test(token)) return value.includes(token);
    return ` ${value} `.includes(` ${token} `);
  }

  function scoreEntry(entry, tokens, phrase) {
    const section = normalize(entry.section);
    const text = normalize(entry.text);
    if (!tokens.every((token) => containsToken(section, token) || containsToken(text, token)))
      return 0;
    let score = tokens.reduce(
      (total, token) =>
        total + (containsToken(section, token) ? 10 : 0) + (containsToken(text, token) ? 2 : 0),
      0,
    );
    if (phrase && section.includes(phrase)) score += 16;
    if (phrase && text.includes(phrase)) score += 6;
    return score;
  }

  function snippetFor(entry, tokens) {
    const source = entry.text;
    const lower = source.toLocaleLowerCase("uk");
    const positions = tokens
      .map((token) => lower.indexOf(token))
      .filter((position) => position >= 0)
      .sort((left, right) => left - right);
    if (!positions.length) return source.slice(0, 190).trim();
    const start = Math.max(0, positions[0] - 55);
    const end = Math.min(source.length, positions[0] + 125);
    return `${start ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
  }

  function appendHighlighted(container, value, tokens) {
    if (!tokens.length) {
      container.textContent = value;
      return;
    }
    const alternatives = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
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

  function clearContentHighlights() {
    document.querySelectorAll("mark.topic-search-hit").forEach((mark) => {
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent));
      parent?.normalize();
    });
  }

  function highlightContent(targetId, tokens) {
    clearContentHighlights();
    if (!targetId || !tokens.length) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    const alternatives = tokens
      .sort((left, right) => right.length - left.length)
      .map((token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return token.length <= 3 || /^\d+$/.test(token)
          ? `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`
          : escaped;
      });
    const pattern = new RegExp(`(${alternatives.join("|")})`, "giu");
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (
          node.parentElement?.closest(
            "script, style, mark, input, textarea, button, .topic-search-panel",
          )
        )
          return NodeFilter.FILTER_REJECT;
        pattern.lastIndex = 0;
        return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      pattern.lastIndex = 0;
      node.nodeValue.split(pattern).forEach((part) => {
        if (!part) return;
        pattern.lastIndex = 0;
        if (pattern.test(part)) {
          const mark = document.createElement("mark");
          mark.className = "topic-search-hit";
          mark.textContent = part;
          fragment.append(mark);
        } else fragment.append(document.createTextNode(part));
      });
      node.replaceWith(fragment);
    });
  }

  function updateUrl(query) {
    const url = new URL(location.href);
    if (query) url.searchParams.set("search", query);
    else url.searchParams.delete("search");
    history.replaceState(null, "", url);
  }

  function localUrl(entry) {
    const hash = entry.url.includes("#") ? `#${entry.url.split("#")[1]}` : "#";
    return `${location.pathname}${location.search}${hash}`;
  }

  function render({ updateHistory = true } = {}) {
    const query = input.value.trim();
    const tokens = queryTokens(query);
    clearContentHighlights();
    results.replaceChildren();
    form.classList.toggle("has-query", Boolean(query));
    clearButton.hidden = !query;
    if (updateHistory) updateUrl(query);

    if (!query) {
      status.textContent = `Пошук у ${entries.length} розділах цієї теми.`;
      results.hidden = true;
      return;
    }
    if (!tokens.length) {
      status.textContent = "Введи щонайменше два символи.";
      results.hidden = true;
      return;
    }

    const phrase = normalize(query);
    const matches = entries
      .map((entry) => ({ entry, score: scoreEntry(entry, tokens, phrase) }))
      .filter((item) => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.entry.section.localeCompare(right.entry.section, "uk"),
      );

    status.textContent = matches.length
      ? `Знайдено: ${matches.length}`
      : "Нічого не знайдено в цій темі.";
    results.hidden = !matches.length;
    matches.slice(0, 12).forEach(({ entry }) => {
      const link = document.createElement("a");
      link.className = "topic-search-result";
      link.href = localUrl(entry);
      const targetId = entry.url.includes("#") ? decodeURIComponent(entry.url.split("#")[1]) : "";
      link.addEventListener("click", () => highlightContent(targetId, tokens));
      const heading = document.createElement("strong");
      heading.textContent = entry.section;
      const snippet = document.createElement("span");
      appendHighlighted(snippet, snippetFor(entry, tokens), tokens);
      link.append(heading, snippet);
      results.append(link);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  input.addEventListener("input", () => render());
  clearButton.addEventListener("click", () => {
    input.value = "";
    render();
    input.focus();
  });
  input.value = new URLSearchParams(location.search).get("search") || "";
  render({ updateHistory: false });
  const initialTarget = decodeURIComponent(location.hash.slice(1));
  if (initialTarget && input.value) highlightContent(initialTarget, queryTokens(input.value));
  window.addEventListener("hashchange", () =>
    highlightContent(decodeURIComponent(location.hash.slice(1)), queryTokens(input.value)),
  );
})();
