import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { PropertiesSidebar } from "@/components/editor/properties-sidebar";
import { DesignCanvas } from "@/components/preview/design-canvas";

export default function EditorPage() {
  return (
    <div className="flex h-dvh flex-col">
      <EditorToolbar />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <PropertiesSidebar />
        <main aria-label="Design canvas" className="min-h-0 min-w-0 flex-1">
          <DesignCanvas />
        </main>
      </div>
    </div>
  );
}
