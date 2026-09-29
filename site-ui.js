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
  const slugify = (value) => value
    .toLocaleLowerCase("uk")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "rozdil";

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

  const showToast = () => {
    toast.classList.add("is-visible");
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
    if (!targetId && heading.tagName === "H2") targetId = section.id;
    if (!targetId) {
      targetId = uniqueId(`${section.id}-${slugify(heading.textContent)}`);
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
        showToast();
      } catch {
        toast.textContent = "Не вдалося скопіювати посилання";
        showToast();
        setTimeout(() => { toast.textContent = "Посилання скопійовано"; }, 1900);
      }
    });
    heading.append(button);
  });

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
