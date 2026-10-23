import { PagePanel } from "./page-panel";
import { SelectedElementControls } from "./selected-element-controls";

export function PropertiesSidebar() {
  return (
    <aside
      aria-label="Properties"
      className="shrink-0 overflow-y-auto border-b bg-sidebar text-sidebar-foreground md:w-72 md:border-r md:border-b-0"
    >
      <SelectedElementControls />
      <PagePanel />
    </aside>
  );
}
