import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Plus, Trash2, Check } from "lucide-react";
import { AppLogoStatic } from "../components/AppLogo";

type LinkedAccount = { id: string; name: string; detail: string; linked: boolean; color: string };

export default function PaymentMethodsPage() {
  const navigate = useNavigate();
  const [ewallets, setEwallets] = useState<LinkedAccount[]>([
    { id: "gcash", name: "GCash", detail: "Not linked", linked: false, color: "#0070E0" },
    { id: "maya", name: "Maya", detail: "Not linked", linked: false, color: "#18C16E" },
  ]);
  const [cards, setCards] = useState([
    { id: "1", label: "Visa •••• 4242", type: "Visa" },
  ]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: "", name: "", expiry: "", cvv: "" });

  const toggleWallet = (id: string) => {
    setEwallets(w => w.map(e => e.id === id ? { ...e, linked: !e.linked, detail: !e.linked ? "+63 912 345 6789" : "Not linked" } : e));
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-4" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: "8px", borderRadius: "10px", display: "flex" }}>
            <ChevronLeft size={20} style={{ color: "#1E293B" }} />
          </button>
          <AppLogoStatic height={28} />
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#1E293B" }}>Payment Methods</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-6">
          {/* E-Wallets */}
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "0 0 10px" }}>E-WALLETS</p>
            <div className="flex flex-col gap-3">
              {ewallets.map(w => (
                <div key={w.id} className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: `2px solid ${w.linked ? "#A7F3D0" : "#E2E8F0"}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: w.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", fontWeight: 700, color: "#FFFFFF" }}>{w.name}</span>
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 }}>{w.name}</p>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: w.linked ? "#16A34A" : "#94A3B8", margin: 0 }}>{w.detail}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWallet(w.id)}
                      style={{ height: "34px", paddingInline: "14px", borderRadius: "10px", background: w.linked ? "#FEF2F2" : "#0F766E", color: w.linked ? "#DC2626" : "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, border: w.linked ? "1px solid #FECACA" : "none", cursor: "pointer" }}>
                      {w.linked ? "Unlink" : "Link"}
                    </button>
                  </div>
                  {w.linked && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid #ECFDF5" }}>
                      <Check size={12} style={{ color: "#16A34A" }} />
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#16A34A" }}>Account linked and ready for payments</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "0 0 10px" }}>CREDIT / DEBIT CARDS</p>
            <div className="flex flex-col gap-3">
              {cards.map(card => (
                <div key={card.id} className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: "42px", height: "28px", borderRadius: "6px", background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "9px", fontWeight: 700, color: "#FFFFFF" }}>{card.type}</span>
                    </div>
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1E293B" }}>{card.label}</span>
                  </div>
                  <button onClick={() => setCards(c => c.filter(x => x.id !== card.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#94A3B8" }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button onClick={() => setShowAddCard(!showAddCard)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3"
                style={{ background: "#F8FAFC", border: "2px dashed #CBD5E1", cursor: "pointer" }}>
                <Plus size={16} style={{ color: "#64748B" }} />
                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B" }}>Add New Card</span>
              </button>

              {showAddCard && (
                <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "#FFFFFF", border: "1.5px solid #0F766E" }}>
                  {[
                    { label: "Card Number", placeholder: "1234 5678 9012 3456", key: "number" },
                    { label: "Cardholder Name", placeholder: "Juan dela Cruz", key: "name" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>{f.label}</label>
                      <input type="text" placeholder={f.placeholder}
                        style={{ width: "100%", height: "44px", borderRadius: "10px", paddingInline: "14px", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B", background: "#F8FAFC", border: "1.5px solid #E2E8F0", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Expiry</label>
                      <input type="text" placeholder="MM/YY" style={{ width: "100%", height: "44px", borderRadius: "10px", paddingInline: "14px", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B", background: "#F8FAFC", border: "1.5px solid #E2E8F0", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>CVV</label>
                      <input type="text" placeholder="•••" style={{ width: "100%", height: "44px", borderRadius: "10px", paddingInline: "14px", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B", background: "#F8FAFC", border: "1.5px solid #E2E8F0", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <button
                    onClick={() => { setCards(c => [...c, { id: Date.now().toString(), label: "Visa •••• 0000", type: "Visa" }]); setShowAddCard(false); }}
                    style={{ height: "44px", borderRadius: "12px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 500, border: "none", cursor: "pointer" }}>
                    Save Card
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
