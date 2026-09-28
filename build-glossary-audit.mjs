import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(root, "glossary-data.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "glossary-data.js" });

const terms = context.window.GLOSSARY_TERMS;
const reviewed = context.window.GLOSSARY_REVIEWED_TOPICS;
if (!Array.isArray(terms) || !Array.isArray(reviewed)) throw new Error("Glossary data is invalid.");

const entries = await readdir(root, { withFileTypes: true });
const topics = entries.filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name)).map((entry) => entry.name).sort();
const missingReviews = topics.filter((topic) => !reviewed.includes(topic));
const staleReviews = reviewed.filter((topic) => !topics.includes(topic));
const duplicateTerms = terms.map((entry) => entry.term.toLocaleLowerCase("uk-UA")).filter((term, index, all) => all.indexOf(term) !== index);
const anchors = terms.map((entry) => entry.term.toLocaleLowerCase("uk-UA").replace(/\+/g, "-plus").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, ""));
const duplicateAnchors = anchors.filter((anchor, index, all) => all.indexOf(anchor) !== index);
const incomplete = terms.filter((entry) => !entry.term || !entry.full || !entry.description).map((entry) => entry.term || "(без назви)");

if (missingReviews.length || staleReviews.length || duplicateTerms.length || duplicateAnchors.length || incomplete.length) {
  const messages = [];
  if (missingReviews.length) messages.push(`Нові теми без перевірки глосарія: ${missingReviews.join(", ")}`);
  if (staleReviews.length) messages.push(`Неіснуючі теми у GLOSSARY_REVIEWED_TOPICS: ${staleReviews.join(", ")}`);
  if (duplicateTerms.length) messages.push(`Дублікати термінів: ${[...new Set(duplicateTerms)].join(", ")}`);
  if (duplicateAnchors.length) messages.push(`Колізії посилань глосарія: ${[...new Set(duplicateAnchors)].join(", ")}`);
  if (incomplete.length) messages.push(`Неповні записи: ${incomplete.join(", ")}`);
  throw new Error(`${messages.join("\n")}\nПереглянь терміни нової теми та онови glossary-data.js.`);
}

console.log(`Glossary checked: ${terms.length} terms, ${topics.length} reviewed topics.`);
