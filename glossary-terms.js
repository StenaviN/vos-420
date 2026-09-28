"use strict";

(() => {
  const terms = Array.isArray(window.GLOSSARY_TERMS) ? window.GLOSSARY_TERMS : [];
  const root = document.querySelector("main");
  if (!root || !terms.length) return;

  const byTerm = new Map(terms.map((entry) => [entry.term.toLocaleLowerCase("uk-UA"), entry]));
  const candidates = terms
    .filter((entry) => entry.term.length >= 3 || entry.term === "3G")
    .map((entry) => entry.term)
    .sort((left, right) => right.length - left.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${candidates.join("|")})(?=$|[^\\p{L}\\p{N}])`, "giu");
  const excluded = "script, style, code, kbd, a, button, input, textarea, select, .menu-path, .glossary-inline, .topbar";
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim() || node.parentElement?.closest(excluded)) return NodeFilter.FILTER_REJECT;
      pattern.lastIndex = 0;
      return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    pattern.lastIndex = 0;
    for (const match of node.nodeValue.matchAll(pattern)) {
      const prefixLength = match[1].length;
      const termStart = match.index + prefixLength;
      if (termStart > cursor) fragment.append(node.nodeValue.slice(cursor, termStart));
      const entry = byTerm.get(match[2].toLocaleLowerCase("uk-UA"));
      const marker = document.createElement("span");
      marker.className = "glossary-term";
      marker.tabIndex = 0;
      marker.setAttribute("role", "button");
      marker.setAttribute("aria-expanded", "false");
      marker.dataset.glossaryTerm = entry.term;
      marker.textContent = match[2];
      fragment.append(marker);
      cursor = termStart + match[2].length;
    }
    fragment.append(node.nodeValue.slice(cursor));
    node.replaceWith(fragment);
  });

  const tooltip = document.createElement("div");
  tooltip.className = "glossary-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);

  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");
  let openMarker = null;
  let inline = null;

  function content(entry, includeLink) {
    const wrapper = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${entry.term} - ${entry.full}`;
    wrapper.append(title);
    if (entry.uk) {
      const translation = document.createElement("span");
      translation.className = "glossary-translation";
      translation.textContent = entry.uk;
      wrapper.append(translation);
    }
    if (entry.description) {
      const description = document.createElement("span");
      description.textContent = entry.description;
      wrapper.append(description);
    }
    if (includeLink) {
      const link = document.createElement("a");
      link.href = `${window.GLOSSARY_ROOT || ""}glossary.html#${entry.term.toLocaleLowerCase("uk-UA").replace(/\+/g, "-plus").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}`;
      link.textContent = "Відкрити у глосарії";
      wrapper.append(link);
    }
    return wrapper;
  }

  function showTooltip(marker) {
    if (coarsePointer.matches) return;
    const entry = byTerm.get(marker.dataset.glossaryTerm.toLocaleLowerCase("uk-UA"));
    tooltip.replaceChildren(content(entry, false));
    tooltip.hidden = false;
    const rect = marker.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - tipRect.width - 12, Math.max(12, rect.left + rect.width / 2 - tipRect.width / 2));
    const above = rect.top > tipRect.height + 18;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${above ? rect.top - tipRect.height - 8 : rect.bottom + 8}px`;
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  function closeInline() {
    if (openMarker) openMarker.setAttribute("aria-expanded", "false");
    inline?.remove();
    inline = null;
    openMarker = null;
  }

  function toggleInline(marker) {
    if (openMarker === marker) {
      closeInline();
      return;
    }
    closeInline();
    const entry = byTerm.get(marker.dataset.glossaryTerm.toLocaleLowerCase("uk-UA"));
    inline = document.createElement("div");
    inline.className = "glossary-inline";
    inline.append(content(entry, true));
    const container = marker.closest("p, li, td, dd, figcaption") || marker.parentElement;
    container.append(inline);
    marker.setAttribute("aria-expanded", "true");
    openMarker = marker;
  }

  root.addEventListener("pointerover", (event) => {
    const marker = event.target.closest?.(".glossary-term");
    if (marker) showTooltip(marker);
  });
  root.addEventListener("pointerout", (event) => {
    if (event.target.closest?.(".glossary-term")) hideTooltip();
  });
  root.addEventListener("focusin", (event) => {
    const marker = event.target.closest?.(".glossary-term");
    if (marker) showTooltip(marker);
  });
  root.addEventListener("focusout", hideTooltip);
  root.addEventListener("click", (event) => {
    const marker = event.target.closest?.(".glossary-term");
    if (marker && coarsePointer.matches) toggleInline(marker);
  });
  root.addEventListener("keydown", (event) => {
    const marker = event.target.closest?.(".glossary-term");
    if (marker && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleInline(marker);
    }
  });
})();
