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
  const anchorHeadings = [];
  let anchorUpdateTimer;
  let holdAnchorUntil = 0;
  const replaceAnchor = (id) => {
    const url = new URL(location.href);
    url.hash = id;
    if (url.href !== location.href) history.replaceState(history.state, "", url);
  };

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
      clearTimeout(anchorUpdateTimer);
      holdAnchorUntil = performance.now() + 500;
      const url = new URL(window.location.href);
      url.hash = targetId;
      replaceAnchor(targetId);
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
    anchorHeadings.push({ heading, id: targetId });
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

  // Track reading position only in notes, leaving quiz and other page hashes alone.
  if (/\/\d{2}-[^/]+\/(?:index\.html)?$/.test(location.pathname)) {
    const updateReadingAnchor = () => {
      if (performance.now() < holdAnchorUntil || document.querySelector("dialog[open]")) return;
      const readingLine = Math.min(140, innerHeight * .2);
      let activeId = "";
      for (const { heading, id } of anchorHeadings) {
        if (!heading.getClientRects().length) continue;
        if (heading.getBoundingClientRect().top > readingLine) break;
        activeId = id;
      }
      replaceAnchor(activeId);
    };
    window.addEventListener("scroll", () => {
      clearTimeout(anchorUpdateTimer);
      anchorUpdateTimer = setTimeout(updateReadingAnchor, 150);
    }, { passive: true });
    window.addEventListener("hashchange", () => {
      clearTimeout(anchorUpdateTimer);
      holdAnchorUntil = performance.now() + 600;
    });
    // Preserve an incoming deep link during initial layout and image loading.
    holdAnchorUntil = performance.now() + 800;
  }
})();

(() => {
  document.querySelectorAll("main img").forEach(image => {
    if (image.closest("button, a")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "procedure-shot-button";
    button.setAttribute("aria-label", `Збільшити: ${image.alt || "зображення"}`);
    image.replaceWith(button);
    button.append(image);
  });
  const triggers = [...document.querySelectorAll(".procedure-shot-button")];
  if (!triggers.length || typeof HTMLDialogElement === "undefined") return;

  const dialog = document.createElement("dialog");
  dialog.className = "media-viewer";
  dialog.setAttribute("aria-label", "Перегляд зображення");
  dialog.innerHTML = `
    <div class="media-viewer-toolbar" role="group" aria-label="Масштаб зображення">
      <button type="button" data-zoom="out" aria-label="Зменшити зображення">−</button>
      <output class="media-viewer-scale" aria-label="Поточний масштаб">100%</output>
      <button type="button" data-zoom="in" aria-label="Збільшити зображення">+</button>
      <button type="button" data-zoom="fit">Вмістити</button>
    </div>
    <button class="media-viewer-close" type="button" aria-label="Закрити збільшене зображення" title="Закрити">×</button>
    <div class="media-viewer-stage" tabindex="0" aria-label="Зображення: збільшення колесом або двома пальцями, переміщення перетягуванням">
      <div class="media-viewer-canvas"><img alt="" draggable="false"></div>
    </div>
    <p class="media-viewer-caption"></p>`;
  document.body.append(dialog);
  const image = dialog.querySelector("img");
  const stage = dialog.querySelector(".media-viewer-stage");
  const canvas = dialog.querySelector(".media-viewer-canvas");
  const caption = dialog.querySelector(".media-viewer-caption");
  const closeButton = dialog.querySelector(".media-viewer-close");
  const output = dialog.querySelector("output");
  const zoomIn = dialog.querySelector('[data-zoom="in"]');
  const zoomOut = dialog.querySelector('[data-zoom="out"]');
  let zoom = 1;
  let opener;
  const pointers = new Map();

  function render(nextZoom = zoom, point) {
    if (!dialog.open || !image.naturalWidth || !stage.clientWidth) return;
    const viewport = stage.getBoundingClientRect();
    const before = image.getBoundingClientRect();
    const x = point?.x ?? viewport.left + stage.clientWidth / 2;
    const y = point?.y ?? viewport.top + stage.clientHeight / 2;
    const fx = before.width ? (x - before.left) / before.width : .5;
    const fy = before.height ? (y - before.top) / before.height : .5;
    zoom = Math.max(1, Math.min(8, nextZoom));
    const fit = Math.min(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight, 1);
    const width = image.naturalWidth * fit * zoom;
    const height = image.naturalHeight * fit * zoom;
    const canvasWidth = Math.max(stage.clientWidth, width);
    const canvasHeight = Math.max(stage.clientHeight, height);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    stage.scrollLeft = (canvasWidth - width) / 2 + fx * width - (x - viewport.left);
    stage.scrollTop = (canvasHeight - height) / 2 + fy * height - (y - viewport.top);
    output.value = `${Math.round(zoom * 100)}%`;
    zoomOut.disabled = zoom <= 1;
    zoomIn.disabled = zoom >= 8;
    stage.classList.toggle("is-zoomed", zoom > 1);
  }
  function fit() {
    render(1);
    stage.scrollTo(0, 0);
  }
  image.addEventListener("load", fit);
  zoomIn.addEventListener("click", () => render(zoom * 1.5));
  zoomOut.addEventListener("click", () => render(zoom / 1.5));
  dialog.querySelector('[data-zoom="fit"]').addEventListener("click", fit);
  stage.addEventListener("wheel", event => {
    event.preventDefault();
    render(zoom * Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .004), { x: event.clientX, y: event.clientY });
  }, { passive: false });
  stage.addEventListener("dblclick", event => render(zoom > 1 ? 1 : 2, { x: event.clientX, y: event.clientY }));
  stage.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const oldPair = [...pointers.values()];
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pair = [...pointers.values()];
    if (pair.length === 2) {
      const distance = points => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const oldDistance = distance(oldPair);
      if (oldDistance > 0) render(zoom * distance(pair) / oldDistance, { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 });
    } else if (pair.length === 1) {
      stage.scrollLeft -= event.clientX - previous.x;
      stage.scrollTop -= event.clientY - previous.y;
    }
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stage.addEventListener(name, event => pointers.delete(event.pointerId));
  }
  dialog.addEventListener("keydown", event => {
    if (["+", "=", "-", "0"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "0") fit();
      else render(event.key === "-" ? zoom / 1.5 : zoom * 1.5);
    }
  });
  new ResizeObserver(() => { if (dialog.open) fit(); }).observe(dialog);
  triggers.forEach(trigger => {
    trigger.addEventListener("click", () => {
      const source = trigger.querySelector("img");
      if (!source) return;
      opener = trigger;
      pointers.clear();
      zoom = 1;
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      caption.textContent = trigger.closest("figure")?.querySelector("figcaption")?.textContent || source.alt;
      dialog.showModal();
      fit();
      closeButton.focus();
    });
  });
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {
    pointers.clear();
    image.removeAttribute("src");
    opener?.focus({ preventScroll: true });
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
