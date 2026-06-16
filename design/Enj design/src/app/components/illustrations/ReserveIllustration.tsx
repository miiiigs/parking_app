export function ReserveIllustration() {
  const slots = [
    { id: "A1", status: "occupied" },
    { id: "A2", status: "occupied" },
    { id: "A3", status: "available" },
    { id: "A4", status: "available" },
    { id: "B1", status: "available" },
    { id: "B2", status: "selected" },
    { id: "B3", status: "occupied" },
    { id: "B4", status: "available" },
    { id: "C1", status: "occupied" },
    { id: "C2", status: "available" },
    { id: "C3", status: "occupied" },
    { id: "C4", status: "occupied" },
  ];

  const slotColors: Record<string, { bg: string; border: string; text: string; label?: string }> = {
    occupied: { bg: "#FEE2E2", border: "#FECACA", text: "#DC2626" },
    available: { bg: "#DCFCE7", border: "#BBF7D0", text: "#16A34A" },
    selected: { bg: "#0F766E", border: "#0F766E", text: "#FFFFFF", label: "You" },
  };

  return (
    <div className="relative w-full flex items-center justify-center" style={{ height: "340px" }}>
      <div
        className="absolute inset-x-4 rounded-3xl overflow-hidden flex flex-col"
        style={{
          top: "10px",
          bottom: "10px",
          background: "#FFFFFF",
          boxShadow: "0 8px 32px rgba(15, 118, 110, 0.12), 0 2px 8px rgba(15, 118, 110, 0.08)",
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3" style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)" }}>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.5px" }}>SELECT A SLOT</div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#FFFFFF", marginTop: "2px" }}>Level 2 — Section B</div>
          <div className="flex gap-3 mt-3">
            {[
              { label: "Available", color: "#34D399" },
              { label: "Occupied", color: "#F87171" },
              { label: "Selected", color: "#FFFFFF" },
            ].map((leg) => (
              <div key={leg.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: leg.color }} />
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{leg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Parking lot grid */}
        <div className="flex-1 flex flex-col justify-center px-4 py-3">
          {/* Drive lane label */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", fontWeight: 500, color: "#94A3B8" }}>DRIVE LANE</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)" }} />
          </div>

          {/* Slot rows */}
          {["A", "B", "C"].map((row, rowIdx) => (
            <div key={row} className="flex items-center gap-2 mb-2">
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#94A3B8", width: "12px" }}>{row}</span>
              <div className="flex gap-2 flex-1">
                {slots.filter((s) => s.id.startsWith(row)).map((slot) => {
                  const style = slotColors[slot.status];
                  return (
                    <div
                      key={slot.id}
                      className="flex-1 rounded-lg flex flex-col items-center justify-center"
                      style={{
                        height: "52px",
                        background: style.bg,
                        border: `2px solid ${style.border}`,
                        boxShadow: slot.status === "selected" ? "0 4px 12px rgba(15,118,110,0.35)" : "none",
                        transform: slot.status === "selected" ? "scale(1.05)" : "scale(1)",
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 700, color: style.text }}>{slot.id}</span>
                      {style.label && (
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", fontWeight: 600, color: style.text, opacity: 0.9 }}>{style.label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Drive lane bottom */}
          <div className="flex items-center gap-2 mt-0">
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)" }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "8px", fontWeight: 500, color: "#94A3B8" }}>EXIT →</span>
            <div className="flex-1 h-px" style={{ background: "repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 6px, transparent 6px, transparent 12px)" }} />
          </div>
        </div>

        {/* Confirm row */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between bg-[#F0FDF4] rounded-2xl px-3 py-2.5" style={{ border: "1.5px solid #BBF7D0" }}>
            <div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 600, color: "#1E293B" }}>Slot B2 selected</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 400, color: "#64748B" }}>2 hrs · ₱60.00</div>
            </div>
            <div className="rounded-xl px-3 py-1.5" style={{ background: "#0F766E" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "10px", fontWeight: 600, color: "#FFFFFF" }}>Reserve</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
