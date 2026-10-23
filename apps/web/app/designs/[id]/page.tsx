import { DesignLoader } from "@/components/designs/design-loader";
import { DesignAssistant } from "@/components/editor/design-assistant";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { PropertiesSidebar } from "@/components/editor/properties-sidebar";
import { DesignCanvas } from "@/components/preview/design-canvas";

export default async function DesignEditorPage({
  params,
}: PageProps<"/designs/[id]">) {
  const { id } = await params;
  return (
    <DesignLoader key={id} id={id}>
      <div className="flex h-dvh flex-col">
        <EditorToolbar />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <PropertiesSidebar />
          <main aria-label="Design canvas" className="min-h-0 min-w-0 flex-1">
            <DesignCanvas />
          </main>
          <aside
            aria-label="Design assistant"
            className="h-[28rem] shrink-0 border-t bg-sidebar text-sidebar-foreground md:h-auto md:w-80 md:border-t-0 md:border-l"
          >
            <DesignAssistant />
          </aside>
        </div>
      </div>
    </DesignLoader>
  );
}
