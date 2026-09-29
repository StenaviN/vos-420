"use strict";

(() => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.title = "Повернутися на початок сторінки";
  button.setAttribute("aria-label", "Повернутися на початок сторінки");
  button.innerHTML = '<span aria-hidden="true">↑</span>';
  button.addEventListener("click", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
  document.body.append(button);
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
