const DIRECTIVE =
  /^\s*(eslint-disable|eslint-enable|eslint |global |@ts-|\/ <reference)/;
const TRAILING_PERIOD = /(^|[^.])\.$/;
const TODO = /\bTODO\b/;
const TICKETED_TODO = /\bTODO\(\.scratch\/[^)]+\)/;

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
        "Write TODOs with a ticket path, e.g. TODO(.scratch/editor/issues/03)",
      blockComment: "Use // comments; /* */ is only for JSDoc and JSX comments",
    },
  },
  create(context) {
    const { sourceCode } = context;
    const { text } = sourceCode;

    function isOwnLine(comment) {
      const line = sourceCode.lines[comment.loc.start.line - 1];
      return line.slice(0, comment.loc.start.column).trim() === "";
    }

    function isJsxComment(comment) {
      const before = text.slice(0, comment.range[0]).trimEnd();
      const after = text.slice(comment.range[1]).trimStart();
      return before.endsWith("{") && after.startsWith("}");
    }

    function checkText(comment, value) {
      if (TRAILING_PERIOD.test(value)) {
        context.report({ loc: comment.loc, messageId: "trailingPeriod" });
      }
      if (TODO.test(value) && !TICKETED_TODO.test(value)) {
        context.report({ loc: comment.loc, messageId: "todoWithoutTicket" });
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

          if (comment.value.startsWith("*")) {
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
