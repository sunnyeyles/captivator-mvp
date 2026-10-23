import { BackToDesignsLink } from "./back-to-designs-link";
import { CanvasModeSwitcher } from "./canvas-mode-switcher";
import { CurrentDesignStatus } from "./current-design-status";
import { DesignNameField } from "./design-name-field";
import { DeviceModeSwitcher } from "./device-mode-switcher";
import { HistoryControls } from "./history-controls";
import { SaveControls } from "./save-controls";

export function EditorToolbar() {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-card px-4 py-2 text-card-foreground lg:grid lg:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-2">
        <BackToDesignsLink />
        <DesignNameField />
        <CurrentDesignStatus />
      </div>
      <DeviceModeSwitcher />
      <div className="flex items-center gap-2 lg:justify-self-end">
        <SaveControls />
        <HistoryControls />
        <CanvasModeSwitcher />
      </div>
    </header>
  );
}
