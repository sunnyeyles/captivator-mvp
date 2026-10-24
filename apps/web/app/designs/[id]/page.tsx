import { DesignLoader } from "@/components/designs/design-loader";
import { DesignAssistant } from "@/components/editor/design-assistant";
import { EditorPanels } from "@/components/editor/editor-panels";
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
        <EditorPanels
          properties={<PropertiesSidebar />}
          canvas={<DesignCanvas />}
          assistant={<DesignAssistant />}
        />
      </div>
    </DesignLoader>
  );
}
