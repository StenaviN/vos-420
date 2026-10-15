import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", ".playwright-cli", "output"].includes(entry.name)) continue;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) files.push(...(await htmlFiles(url)));
    else if (entry.name.endsWith(".html")) files.push(url);
  }
  return files;
}
test("all local HTML links, scripts and images resolve after directory changes", async () => {
  for (const file of await htmlFiles(root)) {
    const html = await readFile(file, "utf8");
    const base = new URL(html.match(/<base\b[^>]*href="([^"]+)"/)?.[1] || "", file);
    for (const match of html.replace(/<base\b[^>]*>/g, "").matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const value = match[1].replace(/&amp;/g, "&");
      if (value.startsWith("#") || /^(?:[a-z]+:|\/\/)/i.test(value)) continue;
      const target = new URL(value, base);
      target.search = "";
      target.hash = "";
      assert((await stat(target)).isFile(), `${fileURLToPath(file)} -> ${value}`);
    }
  }
});
