import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const hexadecimal = entity[1].toLowerCase() === "x";
    const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
  });
}

function plainText(html) {
  return decodeEntities(html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html, pattern, fallback) {
  const match = html.match(pattern);
  return match ? plainText(match[1]) : fallback;
}

function sectionEntries(html, directory, topic) {
  const entries = [];
  const sectionPattern = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
  for (const match of html.matchAll(sectionPattern)) {
    const id = match[1].match(/\bid="([^"]+)"/i)?.[1];
    if (!id) continue;
    const section = firstMatch(match[2], /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i, topic);
    const text = plainText(match[2]);
    if (text) entries.push({ topic, section, url: `${directory}/index.html#${id}`, text });
  }
  return entries;
}

const directoryEntries = await readdir(root, { withFileTypes: true });
const topicDirectories = directoryEntries
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, "uk"));

const entries = [];
for (const directory of topicDirectories) {
  const html = await readFile(path.join(root, directory, "index.html"), "utf8");
  const topic = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i, directory);
  const overview = html.match(/<header\b[^>]*class="[^"]*\bhero\b[^"]*"[^>]*>([\s\S]*?)<\/header>/i)?.[1];
  if (overview) entries.push({ topic, section: "Огляд", url: `${directory}/index.html`, text: plainText(overview) });
  entries.push(...sectionEntries(html, directory, topic));
}

const output = `"use strict";\n\nwindow.SEARCH_INDEX = ${JSON.stringify({ version: 1, entries }, null, 2)};\n`;
await writeFile(path.join(root, "search-index.js"), output, "utf8");
console.log(`Indexed ${entries.length} sections from ${topicDirectories.length} topics.`);
