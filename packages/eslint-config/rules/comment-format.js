// Directives and bundler annotations are machine syntax, so their wording is not ours to format
const DIRECTIVE =
  /^\s*(eslint-disable|eslint-enable|eslint\s+[\w@/-]+\s*:|globals?\s+[\w$]+(\s*:\s*\w+)?(\s*,\s*[\w$]+(\s*:\s*\w+)?)*\s*$|@ts-|\/ <reference|[#@]__(PURE|NO_SIDE_EFFECTS)__|(webpack|turbopack)[A-Z]\w*\s*:|@vite-ignore)/;
const TRAILING_PERIOD = /(^|[^.])\.$/;
const MARKER = /\b(TODO|FIXME|XXX|HACK)\b/;
const TICKETED_MARKER = /\b(TODO|FIXME|XXX|HACK)\(\.scratch\/[^)]+\)/;
const DIVIDER = /([-=*#_~+/\\])\1{3,}/;
const LOWERCASE_START = /^[a-z]/;
// A lowercase start is fine when the comment opens with code, such as an identifier, call or path
const CODE_START = /^[a-z][\w$]*([A-Z.(_/:[-]|$)|^[a-z]+\s*[=(]/;
const SENTENCE_END = /[.!?](\s|$)/g;

/** @type {import("eslint").Rule.RuleModule} */
export const commentFormat = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce the one-line comment format from AGENTS.md",
    },
    schema: [],
    messages: {
      trailingPeriod: "Comments have no trailing period",
      multiLine:
        "Comments fit on one line; rename or restructure the code until it does",
      todoWithoutTicket:
        "Write TODO, FIXME, XXX and HACK markers with a ticket path, e.g. TODO(.scratch/editor/issues/03)",
      blockComment: "Use // comments; /* */ is only for JSDoc and JSX comments",
      divider: "No banner or divider comments",
      sentenceCase: "Comments start with a capital letter",
      jsdocNotExported: "JSDoc only documents exported APIs",
      jsdocSentences: "JSDoc is one sentence at most",
    },
  },
  create(context) {
    const { sourceCode } = context;

    function isOwnLine(comment) {
      const line = sourceCode.lines[comment.loc.start.line - 1];
      return line.slice(0, comment.loc.start.column).trim() === "";
    }

    function isJsxComment(comment) {
      const node = sourceCode.getNodeByRangeIndex(comment.range[0]);
      return (
        node?.type === "JSXExpressionContainer" ||
        node?.type === "JSXEmptyExpression"
      );
    }

    function checkText(comment, value) {
      if (DIVIDER.test(value)) {
        context.report({ loc: comment.loc, messageId: "divider" });
        return;
      }
      if (TRAILING_PERIOD.test(value)) {
        context.report({ loc: comment.loc, messageId: "trailingPeriod" });
      }
      if (MARKER.test(value) && !TICKETED_MARKER.test(value)) {
        context.report({ loc: comment.loc, messageId: "todoWithoutTicket" });
      }
      if (LOWERCASE_START.test(value) && !CODE_START.test(value)) {
        context.report({ loc: comment.loc, messageId: "sentenceCase" });
      }
    }

    function documentsExport(comment) {
      const next = sourceCode.getTokenAfter(comment, { includeComments: true });
      return next?.type === "Keyword" && next.value === "export";
    }

    function checkJsdoc(comment) {
      const lines = comment.value
        .split("\n")
        .map((line) => line.replace(/^\s*\*+\s?/, "").trim());
      const tagAt = lines.findIndex((line) => line.startsWith("@"));
      const description = (tagAt === -1 ? lines : lines.slice(0, tagAt))
        .join(" ")
        .trim();
      // Tag-only JSDoc such as @type is a type annotation rather than documentation
      if (description === "") return;
      if (!documentsExport(comment)) {
        context.report({ loc: comment.loc, messageId: "jsdocNotExported" });
      }
      if ((description.match(SENTENCE_END) ?? []).length > 1) {
        context.report({ loc: comment.loc, messageId: "jsdocSentences" });
      }
    }

    return {
      Program() {
        let previousOwnLineComment = null;

        for (const comment of sourceCode.getAllComments()) {
          if (comment.type === "Shebang" || DIRECTIVE.test(comment.value)) {
            continue;
          }

          if (comment.type === "Line") {
            const ownLine = isOwnLine(comment);
            if (
              ownLine &&
              previousOwnLineComment?.loc.end.line ===
                comment.loc.start.line - 1
            ) {
              context.report({ loc: comment.loc, messageId: "multiLine" });
            }
            previousOwnLineComment = ownLine ? comment : null;
            checkText(comment, comment.value.trim());
            continue;
          }

          // Exactly one star opens JSDoc, so /*** banners are reported as block comments
          if (
            comment.value.startsWith("*") &&
            !comment.value.startsWith("**")
          ) {
            checkJsdoc(comment);
            continue;
          }
          if (!isJsxComment(comment)) {
            context.report({ loc: comment.loc, messageId: "blockComment" });
            continue;
          }
          if (comment.loc.start.line !== comment.loc.end.line) {
            context.report({ loc: comment.loc, messageId: "multiLine" });
          }
          checkText(comment, comment.value.trim());
        }
      },
    };
  },
};
