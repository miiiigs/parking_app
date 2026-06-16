import { Outlet } from "react-router";
import { BottomNav } from "../components/BottomNav";

export function AppLayout() {
  return (
    <div className="flex flex-col" style={{ height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
