"use strict";

(() => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.title = "Повернутися на початок сторінки";
  button.setAttribute("aria-label", "Повернутися на початок сторінки");
  button.setAttribute("aria-hidden", "true");
  button.tabIndex = -1;
  button.innerHTML = '<span aria-hidden="true">↑</span>';
  button.addEventListener("click", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
  document.body.append(button);

  const visibilityThreshold = 240;
  let updateQueued = false;

  const updateVisibility = () => {
    const visible = window.scrollY > visibilityThreshold;
    button.classList.toggle("is-visible", visible);
    button.setAttribute("aria-hidden", String(!visible));
    button.tabIndex = visible ? 0 : -1;
    updateQueued = false;
  };

  window.addEventListener("scroll", () => {
    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(updateVisibility);
  }, { passive: true });
  updateVisibility();
})();

(() => {
  const topicMain = document.querySelector("main.page");
  if (!topicMain?.querySelector(":scope > .topbar") || !topicMain.querySelector(":scope > header.hero")) return;

  const headings = [...topicMain.querySelectorAll(":scope > section[id] > h2, :scope > section[id] h3")];
  if (!headings.length) return;

  const usedIds = new Set([...document.querySelectorAll("[id]")].map((element) => element.id));
  const legacyIds = new Map();
  const transliterate = (value) => value.replace(/[а-яіїєґёыэъь]/g, (letter) => ({
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ь: '', ю: 'yu', я: 'ya', ё: 'yo', ы: 'y', э: 'e', ъ: ''
  })[letter]);
  const legacySlug = (value) => value
    .toLocaleLowerCase("uk")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "rozdil";

  const slugify = (value) => transliterate(legacySlug(value)).replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "rozdil";

  const uniqueId = (base) => {
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
    usedIds.add(candidate);
    return candidate;
  };

  const toast = document.createElement("div");
  toast.className = "copy-link-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = "Посилання скопійовано";
  document.body.append(toast);
  let toastTimer;

  const showToast = (anchor) => {
    toast.classList.add("is-visible");
    if (window.matchMedia("(min-width: 701px)").matches) {
      const rect = anchor.getBoundingClientRect();
      const toastWidth = toast.offsetWidth;
      const toastHeight = toast.offsetHeight;
      let left = rect.right + 8;
      if (left + toastWidth > window.innerWidth - 12) left = rect.left - toastWidth - 8;
      toast.style.left = `${Math.max(12, left)}px`;
      toast.style.top = `${Math.min(window.innerHeight - toastHeight / 2 - 12, Math.max(toastHeight / 2 + 12, rect.top + rect.height / 2))}px`;
    } else {
      toast.style.removeProperty("left");
      toast.style.removeProperty("top");
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
  };

  const fallbackCopy = (text) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.className = "clipboard-fallback";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Copy command failed");
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    fallbackCopy(text);
  };

  headings.forEach((heading) => {
    const section = heading.closest("section[id]");
    let targetId = heading.id;
    if (targetId && heading.dataset.legacyAnchor) legacyIds.set(heading.dataset.legacyAnchor, targetId);
    if (!targetId && heading.tagName === "H2") targetId = section.id;
    if (!targetId) {
      const oldBase = `${section.id}-${legacySlug(heading.textContent)}`;
      let oldId = oldBase;
      let suffix = 2;
      while (usedIds.has(oldId) || legacyIds.has(oldId)) oldId = `${oldBase}-${suffix++}`;
      targetId = uniqueId(`${section.id}-${slugify(heading.textContent)}`);
      legacyIds.set(oldId, targetId);
      heading.id = targetId;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "heading-link-button";
    button.title = "Копіювати посилання на цей розділ";
    button.setAttribute("aria-label", `Копіювати посилання на розділ «${heading.textContent.trim()}»`);
    button.innerHTML = '<span aria-hidden="true">🔗</span>';
    button.addEventListener("click", async () => {
      const url = new URL(window.location.href);
      url.hash = targetId;
      try {
        await copyText(url.href);
        showToast(button);
      } catch {
        toast.textContent = "Не вдалося скопіювати посилання";
        showToast(button);
        setTimeout(() => { toast.textContent = "Посилання скопійовано"; }, 1900);
      }
    });
    const label = document.createElement("span");
    label.className = "heading-label";
    while (heading.firstChild) label.append(heading.firstChild);
    heading.classList.add("has-heading-link");
    heading.append(label, button);
  });

  const migrateHash = () => {
    const oldId = decodeURIComponent(location.hash.slice(1));
    const targetId = legacyIds.get(oldId);
    if (targetId && targetId !== oldId) {
      history.replaceState(null, "", `${location.pathname}${location.search}#${targetId}`);
      document.getElementById(targetId)?.scrollIntoView();
    }
  };
  window.addEventListener("hashchange", migrateHash);
  migrateHash();

  const initialTarget = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
  if (initialTarget) requestAnimationFrame(() => initialTarget.scrollIntoView());
})();

(() => {
  const triggers = [...document.querySelectorAll(".procedure-shot-button")];
  if (!triggers.length || typeof HTMLDialogElement === "undefined") return;

  const dialog = document.createElement("dialog");
  dialog.className = "media-viewer";
  dialog.setAttribute("aria-label", "Збільшений скріншот CPA");
  dialog.innerHTML = `
    <button class="media-viewer-close" type="button" aria-label="Закрити збільшене зображення" title="Закрити">×</button>
    <div class="media-viewer-stage">
      <img alt="">
    </div>
    <p class="media-viewer-caption"></p>`;
  document.body.append(dialog);

  const image = dialog.querySelector("img");
  const caption = dialog.querySelector(".media-viewer-caption");
  const closeButton = dialog.querySelector(".media-viewer-close");

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const source = trigger.querySelector("img");
      const figure = trigger.closest("figure");
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      caption.textContent = figure?.querySelector("figcaption")?.textContent || source.alt;
      dialog.showModal();
      closeButton.focus();
    });
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
  });
})();

(() => {
  const topicMain = document.querySelector("main.page");
  const hero = topicMain?.querySelector(":scope > header.hero");
  const sections = topicMain ? [...topicMain.querySelectorAll(":scope > section[id]")] : [];
  if (!hero || !sections.length) return;

  const storageKey = `vos420:collapsed-sections:${location.pathname}`;
  let storedIds = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(stored)) storedIds = stored;
  } catch {
    storedIds = [];
  }
  const collapsedIds = new Set(storedIds);
  const controls = new Map();

  const headingText = (heading) => {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll("button").forEach((button) => button.remove());
    return clone.textContent.trim();
  };

  const saveState = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...collapsedIds]));
    } catch {
      // The controls still work when browser storage is unavailable.
    }
  };

  const setCollapsed = (section, collapsed, { save = true } = {}) => {
    const control = controls.get(section.id);
    if (!control) return;
    section.classList.toggle("is-collapsed", collapsed);
    control.content.hidden = collapsed;
    control.button.setAttribute("aria-expanded", String(!collapsed));
    control.button.title = collapsed ? "Розгорнути розділ" : "Згорнути розділ";
    control.button.setAttribute("aria-label", `${collapsed ? "Розгорнути" : "Згорнути"} розділ «${control.title}»`);
    control.button.querySelector("span").textContent = collapsed ? "▸" : "▾";
    if (collapsed) collapsedIds.add(section.id);
    else collapsedIds.delete(section.id);
    if (save) saveState();
  };

  sections.forEach((section) => {
    const heading = section.querySelector(":scope > h2");
    if (!heading) return;

    const content = document.createElement("div");
    content.className = "section-collapsible-content";
    content.id = `${section.id}-content`;
    while (heading.nextSibling) content.append(heading.nextSibling);
    section.append(content);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "section-toggle";
    button.setAttribute("aria-controls", content.id);
    button.innerHTML = '<span aria-hidden="true"></span>';
    const title = headingText(heading);
    controls.set(section.id, { button, content, title });
    button.addEventListener("click", () => setCollapsed(section, !section.classList.contains("is-collapsed")));
    heading.classList.add("collapsible-heading");
    heading.addEventListener("click", (event) => {
      if (event.target.closest("button, a")) return;
      setCollapsed(section, !section.classList.contains("is-collapsed"));
    });
    heading.prepend(button);
    setCollapsed(section, collapsedIds.has(section.id), { save: false });
  });

  const toolbar = document.createElement("div");
  toolbar.className = "section-collapse-toolbar";
  toolbar.setAttribute("aria-label", "Керування розділами конспекту");
  toolbar.innerHTML = `
    <button type="button" data-action="expand" aria-keyshortcuts="Alt+Shift+ArrowDown"><span aria-hidden="true">＋</span> Розгорнути все</button>
    <button type="button" data-action="collapse" aria-keyshortcuts="Alt+Shift+ArrowUp"><span aria-hidden="true">−</span> Згорнути все</button>`;
  const searchPanel = topicMain.querySelector(":scope > .topic-search-panel");
  const introQuiz = topicMain.querySelector(":scope > .topic-quiz-cta");
  (introQuiz || searchPanel || hero).after(toolbar);

  const setAllCollapsed = (collapsed) => {
    sections.forEach((section) => setCollapsed(section, collapsed, { save: false }));
    saveState();
  };

  toolbar.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.action;
    if (!action) return;
    setAllCollapsed(action === "collapse");
  });

  document.addEventListener("keydown", (event) => {
    if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setAllCollapsed(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setAllCollapsed(false);
    }
  });

  const revealTarget = (target) => {
    const section = target?.matches?.("section[id]") ? target : target?.closest?.("section[id]");
    if (section && controls.has(section.id)) setCollapsed(section, false);
  };

  const revealHash = () => {
    if (!location.hash) return;
    try {
      revealTarget(document.getElementById(decodeURIComponent(location.hash.slice(1))));
    } catch {
      // Ignore malformed URL fragments.
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href*='#']");
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    try {
      revealTarget(document.getElementById(decodeURIComponent(url.hash.slice(1))));
    } catch {
      // Ignore malformed URL fragments.
    }
  });
  window.addEventListener("hashchange", revealHash);
  revealHash();
})();
