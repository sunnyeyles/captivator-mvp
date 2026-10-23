import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import onlyWarn from "eslint-plugin-only-warn";
import tseslint from "typescript-eslint";
import { commentFormat } from "./rules/comment-format.js";
import { noRelativeWorkspaceImport } from "./rules/no-relative-workspace-import.js";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  // Also opts .ts and .tsx files in, which ESLint would otherwise skip
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      local: {
        rules: {
          "comment-format": commentFormat,
          "no-relative-workspace-import": noRelativeWorkspaceImport,
        },
      },
    },
    rules: {
      "local/comment-format": "error",
      "local/no-relative-workspace-import": "error",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**"],
  },
];
