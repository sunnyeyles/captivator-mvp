import { PagePanel } from "./page-panel";
import { SelectedElementControls } from "./selected-element-controls";

export function PropertiesSidebar() {
  return (
    <>
      <SelectedElementControls />
      <PagePanel />
    </>
  );
}
