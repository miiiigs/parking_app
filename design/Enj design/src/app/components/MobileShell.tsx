import { Outlet } from "react-router";

export function MobileShell() {
  return (
    <div
      className="size-full flex items-center justify-center"
      style={{ background: "#E2E8F0" }}
    >
      <div
        className="relative overflow-hidden flex flex-col"
        style={{
          width: "min(360px, 100vw)",
          height: "min(800px, 100vh)",
          background: "#FAFAF9",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)",
          borderRadius: "min(2rem, 0px)",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
