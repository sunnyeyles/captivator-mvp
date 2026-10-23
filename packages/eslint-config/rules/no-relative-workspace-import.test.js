import { join } from "node:path";
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import { noRelativeWorkspaceImport } from "./no-relative-workspace-import.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

// The rule finds workspaces through real package.json files, so fixtures live at real repo paths
const filename = join(import.meta.dirname, "fixture.js");
const ruleTester = new RuleTester();

ruleTester.run("no-relative-workspace-import", noRelativeWorkspaceImport, {
  valid: [
    { filename, code: 'import { a } from "./comment-format.js";' },
    { filename, code: 'import { config } from "../base.js";' },
    { filename, code: 'import { a } from "@repo/portal";' },
    { filename, code: 'export { a } from "./comment-format.js";' },
    { filename, code: 'const a = import("../next.js");' },
  ],
  invalid: [
    {
      filename,
      code: 'import { a } from "../../portal/src/index";',
      errors: [{ messageId: "crossesWorkspace" }],
    },
    {
      filename,
      code: 'export * from "../../../apps/web/lib/images";',
      errors: [{ messageId: "crossesWorkspace" }],
    },
    {
      filename,
      code: 'const a = import("../../ui/src/button");',
      errors: [{ messageId: "crossesWorkspace" }],
    },
  ],
});
