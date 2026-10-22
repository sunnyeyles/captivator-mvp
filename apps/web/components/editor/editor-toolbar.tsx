import { Wifi } from "lucide-react";
import { CanvasModeSwitcher } from "./canvas-mode-switcher";
import { DeviceModeSwitcher } from "./device-mode-switcher";
import { HistoryControls } from "./history-controls";
import { TemplatePicker } from "./template-picker";

export function EditorToolbar() {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-card px-4 py-2 text-card-foreground lg:grid lg:grid-cols-[1fr_auto_1fr]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-semibold">
          <Wifi className="size-5 text-primary" aria-hidden />
          <span>Captivator</span>
        </div>
        <TemplatePicker />
      </div>
      <DeviceModeSwitcher />
      <div className="flex items-center gap-2 lg:justify-self-end">
        <HistoryControls />
        <CanvasModeSwitcher />
      </div>
    </header>
  );
}
