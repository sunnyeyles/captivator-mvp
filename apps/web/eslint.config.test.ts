import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: import.meta.dirname });

async function colourReports(code: string, filePath = "components/x.tsx") {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter(
    (message) => message.ruleId === "no-restricted-syntax",
  );
}

describe("the editor colour rule", () => {
  it("flags hard-coded colours", async () => {
    expect(await colourReports('export const a = "#ffffff";')).toHaveLength(1);
    expect(await colourReports('export const a = "rgb(0 0 0)";')).toHaveLength(
      1,
    );
    expect(await colourReports('export const a = "bg-white";')).toHaveLength(1);
  });

  it("allows colour functions over theme variables", async () => {
    expect(
      await colourReports('export const a = "hsl(var(--chart-1))";'),
    ).toEqual([]);
    expect(
      await colourReports('export const a = "oklch( var(--primary) / 50%)";'),
    ).toEqual([]);
  });
});
