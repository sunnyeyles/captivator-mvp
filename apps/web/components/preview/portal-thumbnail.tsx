import { SplashPage, type Device, type PortalConfig } from "@repo/portal";
import { deviceFrames } from "@/lib/device-frames";

export function PortalThumbnail({
  config,
  width,
  device = "mobile",
  className = "",
}: {
  config: PortalConfig;
  width: number;
  device?: Device;
  className?: string;
}) {
  const frame = deviceFrames[device];
  const scale = width / frame.width;
  return (
    // Inert because the page's own inputs and button must never take focus or clicks here
    <div
      inert
      aria-hidden
      className={`overflow-hidden ${className}`}
      style={{ width, height: frame.height * scale }}
    >
      <div
        className="origin-top-left"
        style={{ ...frame, transform: `scale(${scale})` }}
      >
        <SplashPage config={config} device={device} mode="published" />
      </div>
    </div>
  );
}
