import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const ignoredDirectories = new Set([".git", "node_modules"]);
const generatedAsset = "asset-version.js";

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath));
    else files.push(absolutePath);
  }

  return files;
}

function sitePath(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function isRuntimeAsset(absolutePath) {
  const relativePath = sitePath(absolutePath);
  const extension = path.extname(absolutePath).toLowerCase();
  if (extension === ".css") return true;
  return extension === ".js"
    && relativePath !== generatedAsset
    && !path.basename(relativePath).startsWith("build-");
}

function versionReference(reference, version) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) return reference;

  const hashIndex = reference.indexOf("#");
  const hash = hashIndex >= 0 ? reference.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const extension = path.posix.extname(pathname).toLowerCase();
  if (extension !== ".css" && extension !== ".js") return reference;

  const parameters = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "");
  parameters.set("v", version);
  return `${pathname}?${parameters}${hash}`;
}

function addVersionScript(html, htmlPath) {
  if (/\bsrc=["'][^"']*asset-version\.js(?:[?"'])/i.test(html)) return html;

  const relativePath = path.relative(path.dirname(htmlPath), path.join(root, generatedAsset))
    .split(path.sep)
    .join("/");
  const tag = `  <script src="${relativePath}"></script>\n`;
  const firstScript = html.search(/\s*<script\b/i);
  if (firstScript >= 0) return `${html.slice(0, firstScript)}\n${tag}${html.slice(firstScript)}`;
  return html.replace(/\s*<\/body>/i, `\n${tag}</body>`);
}

function versionHtmlAssets(html, version) {
  return html.replace(
    /(<(?:link|script)\b[^>]*?\b(?:href|src)=)(["'])([^"']+)(\2)/gi,
    (match, prefix, quote, reference) => `${prefix}${quote}${versionReference(reference, version)}${quote}`
  );
}

const files = await collectFiles(root);
const runtimeAssets = files.filter(isRuntimeAsset).sort((left, right) => sitePath(left).localeCompare(sitePath(right)));
const hash = createHash("sha256");

for (const absolutePath of runtimeAssets) {
  hash.update(sitePath(absolutePath));
  hash.update("\0");
  hash.update(await readFile(absolutePath));
  hash.update("\0");
}

const version = hash.digest("hex").slice(0, 12);
const versionSource = `"use strict";\n\nwindow.ASSET_VERSION = "${version}";\n`;
await writeFile(path.join(root, generatedAsset), versionSource, "utf8");

const htmlFiles = files.filter((absolutePath) => path.extname(absolutePath).toLowerCase() === ".html");
for (const htmlPath of htmlFiles) {
  const current = await readFile(htmlPath, "utf8");
  const withVersionScript = addVersionScript(current, htmlPath);
  const updated = versionHtmlAssets(withVersionScript, version);
  if (updated !== current) await writeFile(htmlPath, updated, "utf8");
}

console.log(`Versioned ${runtimeAssets.length} assets in ${htmlFiles.length} HTML files with ${version}.`);
