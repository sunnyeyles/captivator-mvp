import { SplashPage, type PortalConfig } from "@repo/portal";

const MOBILE_FRAME = { width: 390, height: 844 };

export function PortalThumbnail({
  config,
  width,
  className = "",
}: {
  config: PortalConfig;
  width: number;
  className?: string;
}) {
  const scale = width / MOBILE_FRAME.width;
  return (
    // Inert because the page's own inputs and button must never take focus or clicks here
    <div
      inert
      aria-hidden
      className={`overflow-hidden ${className}`}
      style={{ width, height: MOBILE_FRAME.height * scale }}
    >
      <div
        className="origin-top-left"
        style={{ ...MOBILE_FRAME, transform: `scale(${scale})` }}
      >
        <SplashPage config={config} device="mobile" mode="published" />
      </div>
    </div>
  );
}
