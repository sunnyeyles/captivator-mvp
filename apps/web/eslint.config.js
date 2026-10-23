import { nextJsConfig } from "@repo/eslint-config/next-js";

const COLOUR =
  "/#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b|\\b(rgba?|hsla?|oklch)\\(/";
const message =
  "Editor UI uses the theme tokens in app/globals.css, never a hard-coded colour";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    files: ["**/*.{ts,tsx}"],
    // Tests set customer colours on the store, which is data rather than editor styling
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${COLOUR}]`, message },
        { selector: `TemplateElement[value.raw=${COLOUR}]`, message },
      ],
    },
  },
];
