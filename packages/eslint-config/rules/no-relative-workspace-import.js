import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

// Lint visits the same directories for every relative import, so each lookup is answered once per run
const roots = new Map();

function packageRoot(path) {
  if (roots.has(path)) return roots.get(path);
  let root = null;
  if (path !== parse(path).root) {
    root = existsSync(join(path, "package.json"))
      ? path
      : packageRoot(dirname(path));
  }
  roots.set(path, root);
  return root;
}

function specifier(node) {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
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

    function check(source) {
      const path = specifier(source);
      if (path === null || !path.startsWith(".")) return;
      const target = resolve(dirname(context.filename), path);
      if (packageRoot(target) !== fileRoot) {
        context.report({ node: source, messageId: "crossesWorkspace" });
      }
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      TSExternalModuleReference: (node) => check(node.expression),
      // typescript-eslint 8 wraps the path in a literal type
      TSImportType: (node) => check(node.argument?.literal ?? node.argument),
    };
  },
};
