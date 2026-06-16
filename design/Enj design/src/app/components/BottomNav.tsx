import { useLocation, useNavigate } from "react-router";
import { Search, Clock, Menu } from "lucide-react";

const tabs = [
  { label: "Search", icon: Search, path: "/home" },
  { label: "Active Session", icon: Clock, path: "/session" },
  { label: "Menu", icon: Menu, path: "/menu" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #E2E8F0",
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex">
        {tabs.map(({ label, icon: Icon, path }) => {
          const active = location.pathname === path || (path === "/home" && location.pathname === "/guest");
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Icon
                size={22}
                style={{ color: active ? "#0F766E" : "#94A3B8", strokeWidth: active ? 2.2 : 1.8 }}
              />
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "10px",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#0F766E" : "#94A3B8",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
              {active && (
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "2px",
                    background: "#0F766E",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
