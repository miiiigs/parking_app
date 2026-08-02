import logoPng from "../../imports/APP_Logo__2_.png";
import logoGif from "../../imports/APP__Logo.gif";

/** Logo + "ParkingPH" wordmark side by side — use in all page headers */
export function AppLogoStatic({ height = 30 }: { height?: number }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logoPng} alt="ParkingPH" style={{ height, width: "auto", objectFit: "contain", display: "block" }} />
      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 700, color: "#0F766E", letterSpacing: "-0.2px", lineHeight: 1 }}>
        ParkingPH
      </span>
    </div>
  );
}

/** Animated GIF — splash screen only */
export function AppLogoAnimated({ size = 96 }: { size?: number }) {
  return <img src={logoGif} alt="ParkingPH" style={{ width: size, height: size, objectFit: "contain" }} />;
}

/** Stacked logo + wordmark — auth / onboarding hero */
export function AppLogo({ size = 64, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={logoPng} alt="ParkingPH" style={{ width: size, height: size, objectFit: "contain" }} />
      {showWordmark && (
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#0F766E", letterSpacing: "-0.3px", lineHeight: 1 }}>
          ParkingPH
        </span>
      )}
    </div>
  );
}

/** Alias kept for backward compat */
export function AppLogoInline({ height = 28 }: { height?: number }) {
  return <AppLogoStatic height={height} />;
}
