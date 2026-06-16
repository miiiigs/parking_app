import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Smartphone, Check } from "lucide-react";

const METHODS = [
  { id: "card", label: "Credit / Debit Card", sub: "Visa ending in 4242", icon: CreditCard },
  { id: "gcash", label: "GCash", sub: "+63 912 345 6789", icon: Smartphone },
  { id: "maya", label: "Maya", sub: "+63 912 345 6789", icon: Smartphone },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("gcash");

  const reservationFee = 50;
  const parkingFee = 150;
  const total = reservationFee + parkingFee;

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9", overflowY: "auto" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}>
          <ChevronLeft size={20} style={{ color: "#1E293B" }} />
        </button>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "17px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Complete Payment</p>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        {/* Fee breakdown */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <div className="px-4 pt-4 pb-2">
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Fee Breakdown</p>
          </div>
          {[
            { label: "Parking Fee (3 hrs)", amount: parkingFee },
            { label: "Reservation Fee", amount: reservationFee },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center px-4 py-2.5" style={{ borderTop: "1px solid #F1F5F9" }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B" }}>{row.label}</span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#1E293B" }}>₱{row.amount}.00</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-4 py-3 mx-4 mb-4 mt-2 rounded-xl" style={{ background: "#F0FDFA", border: "1px solid #A7F3D0" }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 700, color: "#1E293B" }}>Total Amount</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "18px", fontWeight: 700, color: "#0F766E" }}>₱{total}.00</span>
          </div>
        </div>

        {/* Payment methods */}
        <div>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 12px" }}>Payment Method</p>
          <div className="flex flex-col gap-2.5">
            {METHODS.map(({ id, label, sub, icon: Icon }) => {
              const active = method === id;
              return (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
                  style={{ background: "#FFFFFF", border: `2px solid ${active ? "#0F766E" : "#E2E8F0"}`, cursor: "pointer", boxShadow: active ? "0 0 0 3px rgba(15,118,110,0.1)" : "none" }}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: active ? "#0F766E" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} style={{ color: active ? "#FFFFFF" : "#64748B" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 }}>{label}</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#94A3B8", margin: 0 }}>{sub}</p>
                  </div>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: active ? "#0F766E" : "#F1F5F9", border: `2px solid ${active ? "#0F766E" : "#CBD5E1"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {active && <Check size={13} style={{ color: "#FFFFFF", strokeWidth: 3 }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => navigate("/payment-success")}
          style={{ height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)", marginTop: "4px" }}
        >
          Pay ₱{total}.00
        </button>
      </div>
    </div>
  );
}
