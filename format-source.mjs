import { readFile } from "node:fs/promises";
import { format } from "prettier";

const options = JSON.parse(await readFile(new URL(".prettierrc.json", import.meta.url), "utf8"));

// Keep generated JavaScript readable after builds and saves in the local editor.
export function formatJavaScript(source) {
  return format(source, { ...options, parser: "babel" });
}
