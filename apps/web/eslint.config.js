import { nextJsConfig } from "@repo/eslint-config/next-js";

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// A hex only counts when nothing word-like touches it, so anchors like #add-item stay clear
const COLOUR = `/(^|[\\s[(:,])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\\w-])|\\b(rgba?|hsla?|oklch)\\(|(^|[\\s:])(bg|text|border|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)-(white|black|(${PALETTE})-\\d{2,3})(?![\\w-])/`;
// Hex-letter anchors, ids and selectors look like colours but never style anything
const NOT_STYLING =
  ":not(JSXAttribute[name.name=/^(href|id|htmlFor|aria-[a-z]+)$/] > Literal, CallExpression[callee.property.name=/^(querySelector|querySelectorAll|closest|matches|getElementById)$/] > Literal)";
const message =
  "Editor UI uses the theme tokens in app/globals.css, never a hard-coded colour";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Only the UI folders, since lib code compares customer colours as data
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    // Tests set customer colours on the store, which is data rather than editor styling
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${COLOUR}]${NOT_STYLING}`, message },
        { selector: `TemplateElement[value.raw=${COLOUR}]`, message },
      ],
    },
  },
];
