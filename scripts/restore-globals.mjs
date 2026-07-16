import fs from "fs";

const transcriptPath =
  "C:/Users/USER/.cursor/projects/c-Users-USER-Projects-ryvofund/agent-transcripts/6da9c971-bd12-419e-a352-df94f0493a05/6da9c971-bd12-419e-a352-df94f0493a05.jsonl";
const outPath = "C:/Users/USER/Projects/ryvofund/src/styles/globals.css";

const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
let best = null;

for (const line of lines) {
  if (!line.includes("tailwindcss")) continue;
  try {
    const j = JSON.parse(line);
    for (const part of j.message?.content ?? []) {
      if (part.type !== "tool_use") continue;
      const contents = part.input?.contents;
      const path = part.input?.path ?? "";
      if (
        typeof contents === "string" &&
        contents.includes('@import "tailwindcss"')
      ) {
        if (path.includes("globals.css") || !best) {
          best = contents;
        }
      }
    }
  } catch {
    // skip malformed lines
  }
}

if (!best) {
  console.error("globals.css content not found in transcript");
  process.exit(1);
}

fs.writeFileSync(outPath, best);
console.log(`Restored ${best.length} chars to globals.css`);
