import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

function packageRoot(path) {
  for (let dir = path; dir !== parse(dir).root; dir = dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
  }
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
export const noRelativeWorkspaceImport = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Import other workspaces by package name, never by relative path",
    },
    schema: [],
    messages: {
      crossesWorkspace:
        "This relative import reaches another workspace; import it by package name instead (e.g. @repo/portal)",
    },
  },
  create(context) {
    const fileRoot = packageRoot(dirname(context.filename));

    function check(node) {
      const source = node.source;
      if (
        source?.type !== "Literal" ||
        typeof source.value !== "string" ||
        !source.value.startsWith(".")
      ) {
        return;
      }
      const target = resolve(dirname(context.filename), source.value);
      if (packageRoot(target) !== fileRoot) {
        context.report({ node: source, messageId: "crossesWorkspace" });
      }
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};
