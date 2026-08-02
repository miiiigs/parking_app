import { useLocation, useNavigate } from "react-router";
import { Home, Compass, Clock, LayoutList, User } from "lucide-react";
import { getActiveSession } from "../store";

const tabs = [
  { label: "Home",    icon: Home,       path: "/home" },
  { label: "Explore", icon: Compass,    path: "/explore" },
  { label: "Active",  icon: Clock,      path: "/session" },
  { label: "History", icon: LayoutList, path: "/history" },
  { label: "Profile", icon: User,       path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasSession = getActiveSession();

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid rgba(15,23,42,0.07)",
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div style={{ display: "flex" }}>
        {tabs.map(({ label, icon: Icon, path }) => {
          const active =
            location.pathname === path ||
            (path === "/home" && location.pathname === "/guest");
          const showBadge = label === "Active" && hasSession && !active;

          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: "10px",
                paddingBottom: "8px",
                gap: "3px",
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {active && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "20px",
                    height: "2.5px",
                    borderRadius: "0 0 2px 2px",
                    background: "#0F766E",
                  }}
                />
              )}

              <div style={{ position: "relative" }}>
                <Icon
                  size={20}
                  style={{
                    color: active ? "#0F766E" : "#94A3B8",
                    strokeWidth: active ? 2.2 : 1.7,
                    display: "block",
                  }}
                />
                {showBadge && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-4px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#0F766E",
                      border: "2px solid #FFFFFF",
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "9.5px",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#0F766E" : "#94A3B8",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
