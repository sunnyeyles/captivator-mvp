import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceDir = new URL("../", import.meta.url);
const sourceFiles = readdirSync(sourceDir, {
  recursive: true,
  encoding: "utf8",
}).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

// Published pages reuse the renderer, so it can depend on nothing editor-side
const forbiddenImport = /from\s+["'](?:zustand|web|@)(?:["'/])/;

describe("portal package", () => {
  it.each(sourceFiles)(
    "%s imports nothing from Zustand or the editor",
    (file) => {
      const source = readFileSync(new URL(file, sourceDir), "utf8");

      expect(source).not.toMatch(forbiddenImport);
    },
  );
});
