#!/usr/bin/env node
// PreToolUse hook: blocks edits that add a comment block with more than 2 lines of text.
import { readFileSync, existsSync } from "node:fs";

const MAX = 2;
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|sql)$/;

function blocks(text, sql) {
  const found = [];
  let run = [];
  const flush = () => {
    const words = run.filter((l) => !/^(\/\*+|\*+\/|\*|\/\/|--)$/.test(l));
    if (words.length > MAX) found.push({ run: run.join("\n"), count: words.length, first: words[0] });
    run = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const isComment = /^(\/\/|\/\*|\*)/.test(line) || (sql && line.startsWith("--"));
    if (isComment) run.push(line);
    else flush();
  }
  flush();
  return found;
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const t = input.tool_input ?? {};
  const path = t.file_path ?? "";
  if (!CODE.test(path)) process.exit(0);
  const sql = path.endsWith(".sql");

  let pairs = [];
  if (input.tool_name === "Write") {
    pairs = [[t.content ?? "", existsSync(path) ? readFileSync(path, "utf8") : ""]];
  } else if (input.tool_name === "MultiEdit") {
    pairs = (t.edits ?? []).map((e) => [e.new_string ?? "", e.old_string ?? ""]);
  } else {
    pairs = [[t.new_string ?? "", t.old_string ?? ""]];
  }

  for (const [next, before] of pairs) {
    const old = new Set(blocks(before, sql).map((b) => b.run));
    const bad = blocks(next, sql).find((b) => !old.has(b.run));
    if (bad) {
      process.stderr.write(
        `Blocked: ${bad.count}-line comment at "${bad.first.slice(0, 60)}". ` +
          `Max ${MAX} lines, only where the code isn't obvious. ` +
          `Don't restate the code or record history — that goes in the commit message.\n`,
      );
      process.exit(2);
    }
  }
} catch {
  process.exit(0);
}
