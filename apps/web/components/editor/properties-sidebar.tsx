import { Separator } from "@/components/ui/separator";
import { ConnectButtonGroup } from "./connect-button-group";
import { GuestFieldsGroup } from "./guest-fields-group";
import { BackgroundControls } from "./background-controls";
import { LogoControls } from "./logo-controls";
import { SelectedElementControls } from "./selected-element-controls";
import { TemplateGallery } from "./template-gallery";
import { TextGroup } from "./text-group";

export function PropertiesSidebar() {
  return (
    <aside
      aria-label="Properties"
      className="shrink-0 overflow-y-auto border-b bg-sidebar text-sidebar-foreground md:w-72 md:border-r md:border-b-0"
    >
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold">Properties</h2>
      </div>
      <Separator />
      <SelectedElementControls />
      <section aria-labelledby="templates-group" className="grid gap-3 p-4">
        <h3
          id="templates-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Templates
        </h3>
        <TemplateGallery />
      </section>
      <Separator />
      <section aria-labelledby="branding-group" className="grid gap-3 p-4">
        <h3
          id="branding-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Branding and images
        </h3>
        <LogoControls />
      </section>
      <Separator />
      <section aria-labelledby="background-group" className="grid gap-3 p-4">
        <h3
          id="background-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Background
        </h3>
        <BackgroundControls />
      </section>
      <Separator />
      <section aria-labelledby="text-group" className="grid gap-3 p-4">
        <h3
          id="text-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Text
        </h3>
        <TextGroup />
      </section>
      <Separator />
      <section aria-labelledby="guest-fields-group" className="grid gap-3 p-4">
        <h3
          id="guest-fields-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Guest fields
        </h3>
        <GuestFieldsGroup />
      </section>
      <Separator />
      <section
        aria-labelledby="connect-button-group"
        className="grid gap-3 p-4"
      >
        <h3
          id="connect-button-group"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Connect button
        </h3>
        <ConnectButtonGroup />
      </section>
    </aside>
  );
}
