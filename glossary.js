"use strict";

(() => {
  const terms = [...(window.GLOSSARY_TERMS || [])].sort((left, right) => left.term.localeCompare(right.term, "en", { numeric: true }));
  const list = document.querySelector("#glossaryList");
  const index = document.querySelector("#glossaryIndex");
  const form = document.querySelector("#glossarySearchForm");
  const input = document.querySelector("#glossarySearchInput");
  const clear = document.querySelector("#glossarySearchClear");
  const status = document.querySelector("#glossaryStatus");
  const embedded = Boolean(document.querySelector("#glossaryPanel"));
  const topicMeta = {
    1: ["Тема 1", "01-osnovy-radiozviazku/index.html"],
    2: ["Тема 2", "02-tehnika-bezpeky/index.html"],
    3: ["Тема 3", "03-radiohvyli-radiozviazok-zavady/index.html"],
    4: ["Тема 4", "04-pobudova-radiostantsii-antenny/index.html"],
    5: ["Harris УКХ", "05-harris-ukh/index.html"],
    6: ["Harris КХ", "06-harris-kh/index.html"],
    7: ["Експлуатація HARRIS КХ", "07-harris-kh-ekspluatatsiia/index.html"]
  };

  function slug(term) {
    return term.toLocaleLowerCase("uk-UA").replace(/\+/g, "-plus").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  }

  function group(entry) {
    const first = entry.term[0].toUpperCase();
    return /\d/.test(first) ? "0-9" : first;
  }

  function normalized(value) {
    return String(value || "").toLocaleLowerCase("uk-UA").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  }

  function matches(entry, query) {
    if (!query) return true;
    return normalized([entry.term, entry.full, entry.uk, entry.description].join(" ")).includes(normalized(query));
  }

  function hashFor(id) {
    return embedded ? `#glossary:${id}` : `#${id}`;
  }

  function idFromHash() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return embedded && hash.startsWith("glossary:") ? hash.slice("glossary:".length) : hash;
  }

  function makeEntry(entry) {
    const article = document.createElement("article");
    article.className = "glossary-entry";
    article.id = slug(entry.term);
    article.tabIndex = -1;
    const heading = document.createElement("h2");
    heading.textContent = entry.term;
    const full = document.createElement("p");
    full.className = "glossary-full";
    full.textContent = entry.full;
    article.append(heading, full);
    if (entry.uk) {
      const translation = document.createElement("p");
      translation.className = "glossary-entry-translation";
      translation.textContent = entry.uk;
      article.append(translation);
    }
    if (entry.description) {
      const description = document.createElement("p");
      description.textContent = entry.description;
      article.append(description);
    }
    if (entry.topics?.length) {
      const links = document.createElement("p");
      links.className = "glossary-topic-links";
      links.append("Теми: ");
      entry.topics.forEach((topic, position) => {
        const meta = topicMeta[topic];
        if (!meta) return;
        if (position) links.append(" · ");
        const link = document.createElement("a");
        link.href = meta[1];
        link.textContent = meta[0];
        links.append(link);
      });
      article.append(links);
    }
    return article;
  }

  function render(query = "") {
    const visible = terms.filter((entry) => matches(entry, query));
    const groups = new Map();
    visible.forEach((entry) => {
      const key = group(entry);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });

    list.replaceChildren();
    index.replaceChildren();
    for (const [key, entries] of groups) {
      const section = document.createElement("section");
      section.className = "glossary-group";
      section.id = `group-${slug(key)}`;
      const heading = document.createElement("h2");
      heading.className = "glossary-letter";
      heading.textContent = key;
      section.append(heading, ...entries.map(makeEntry));
      list.append(section);

      const link = document.createElement("a");
      link.href = hashFor(section.id);
      link.textContent = key;
      link.setAttribute("aria-label", `Перейти до розділу ${key}`);
      if (embedded) {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          history.pushState(null, "", hashFor(section.id));
          section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        });
      }
      index.append(link);
    }
    status.textContent = query ? `Знайдено: ${visible.length}` : `Термінів: ${visible.length}`;
    clear.hidden = !query;
    form.classList.toggle("has-query", Boolean(query));
  }

  function setQuery(query) {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    render(query);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setQuery(input.value.trim());
  });
  input.addEventListener("input", () => setQuery(input.value.trim()));
  clear.addEventListener("click", () => {
    input.value = "";
    setQuery("");
    input.focus();
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
  input.value = initialQuery;
  render(initialQuery);
  if (window.location.hash) requestAnimationFrame(() => document.getElementById(idFromHash())?.focus());
})();
