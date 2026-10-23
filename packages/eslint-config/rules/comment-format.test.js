import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { commentFormat } from "./comment-format.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("comment-format", commentFormat, {
  valid: [
    "// Explains why the value is cached\nconst a = 1;",
    "const a = 1; // Trailing why comment",
    "// Waits for the upload...\nconst a = 1;",
    "// TODO(.scratch/editor/issues/03): drop once the store migrates\nconst a = 1;",
    "/** Exported API docs end in a period. */\nexport const a = 1;",
    "/**\n * Multi-line JSDoc.\n */\nexport const a = 1;",
    "// eslint-disable-next-line no-console -- the CLI prints to stdout.\nconsole.log(1);",
    "// Explains the directive below\n// eslint-disable-next-line no-console\nconsole.log(1);",
    "/* eslint-disable no-console */\nconsole.log(1);",
    "// @ts-expect-error the fixture is deliberately invalid.\nconst a: string = 1;",
    '/// <reference types="vite/client" />',
    "const a = <div>{/* Inert so the preview never takes focus */}</div>;",
    "// First thought\nconst a = 1;\n// Second thought\nconst b = 2;",
    "export const a = /*#__PURE__*/ f();",
    'const a = import(/* webpackChunkName: "a" */ "./a");',
    "const a = import(/* @vite-ignore */ path);",
    "/* global window, document: readonly */\nwindow.a = 1;",
    "/* eslint no-console: off */\nconsole.log(1);",
    "// useMemo keeps the reference stable\nconst a = 1;",
    "// fetch() resolves before the timer\nconst a = 1;",
    '/** @type {import("eslint").Linter.Config[]} */\nconst a = [];',
    "/**\n * Shared config for the repo.\n *\n * @type {string}\n */\nexport const a = '';",
  ],
  invalid: [
    {
      code: "// Ends with a period.\nconst a = 1;",
      errors: [{ messageId: "trailingPeriod" }],
    },
    {
      code: "const a = 1; // Ends with a period.",
      errors: [{ messageId: "trailingPeriod" }],
    },
    {
      code: "// First line\n// Second line\nconst a = 1;",
      errors: [{ messageId: "multiLine" }],
    },
    {
      code: "// TODO: fix this\nconst a = 1;",
      errors: [{ messageId: "todoWithoutTicket" }],
    },
    {
      code: "/* Not JSDoc */\nconst a = 1;",
      errors: [{ messageId: "blockComment" }],
    },
    {
      code: "const a = <div>{/* Ends with a period. */}</div>;",
      errors: [{ messageId: "trailingPeriod" }],
    },
    {
      code: "const a = (\n  <div>\n    {/* First line\n        second line */}\n  </div>\n);",
      errors: [{ messageId: "multiLine" }],
    },
    {
      code: "// global state is cached here.\nconst a = 1;",
      errors: [{ messageId: "trailingPeriod" }, { messageId: "sentenceCase" }],
    },
    {
      code: "// FIXME: later\nconst a = 1;",
      errors: [{ messageId: "todoWithoutTicket" }],
    },
    {
      code: "// HACK around the bug\nconst a = 1;",
      errors: [{ messageId: "todoWithoutTicket" }],
    },
    {
      code: "// ------------------------\nconst a = 1;",
      errors: [{ messageId: "divider" }],
    },
    {
      code: "// ===== Section =====\nconst a = 1;",
      errors: [{ messageId: "divider" }],
    },
    {
      code: "// lowercase start\nconst a = 1;",
      errors: [{ messageId: "sentenceCase" }],
    },
    {
      code: "/********** BANNER **********/\nconst a = 1;",
      errors: [{ messageId: "blockComment" }],
    },
    {
      code: "/** Not exported */\nfunction a() {}",
      errors: [{ messageId: "jsdocNotExported" }],
    },
    {
      code: "/**\n * First sentence.\n * Second sentence.\n */\nexport function a() {}",
      errors: [{ messageId: "jsdocSentences" }],
    },
    {
      code: "const o = {/* Inside an object */};",
      errors: [{ messageId: "blockComment" }],
    },
  ],
});
