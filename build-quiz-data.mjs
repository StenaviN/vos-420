import { fileURLToPath } from "node:url";
import { buildQuiz } from "./admin/data.mjs";
console.log(
  `Generated ${await buildQuiz(fileURLToPath(new URL(".", import.meta.url)))} quiz questions.`,
);
