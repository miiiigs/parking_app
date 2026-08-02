import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function PageHeader({ title, onBack, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 16px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <button
        onClick={onBack ?? (() => navigate(-1))}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          background: "#F1F5F9",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <ChevronLeft size={20} style={{ color: "#1E293B" }} />
      </button>

      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Poppins', sans-serif",
          fontSize: "16px",
          fontWeight: 600,
          color: "#1E293B",
          pointerEvents: "none",
        }}
      >
        {title}
      </span>

      <div style={{ marginLeft: "auto", width: "36px", display: "flex", justifyContent: "flex-end", flexShrink: 0, zIndex: 1 }}>
        {right}
      </div>
    </div>
  );
}
