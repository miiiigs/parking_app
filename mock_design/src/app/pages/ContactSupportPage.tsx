import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Phone, MessageSquare, Check, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/PageHeader";

const TOPICS = [
  "Reservation issue",
  "Payment problem",
  "Walk-in parking help",
  "Account & login",
  "Vehicle information",
  "Technical bug",
  "Other",
];

export default function ContactSupportPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [showTopicList, setShowTopicList] = useState(false);

  const canSend = topic && message.trim().length >= 10;

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "100%", background: "#FAFAF9" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #0F766E, #34D399)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(15,118,110,0.3)", marginBottom: "16px" }}>
          <Check size={34} style={{ color: "#FFFFFF", strokeWidth: 2.5 }} />
        </div>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px", fontWeight: 700, color: "#0F766E", margin: 0 }}>Message Sent!</h2>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#64748B", margin: "10px 0 32px", lineHeight: 1.6 }}>
          Our support team will get back to you within <strong style={{ color: "#1E293B" }}>24–48 hours</strong> via email or SMS.
        </p>
        <div className="w-full rounded-2xl p-4 mb-6" style={{ background: "#F0FDFA", border: "1px solid #A7F3D0" }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#64748B", margin: "0 0 4px" }}>Topic submitted</p>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "15px", fontWeight: 600, color: "#0F766E", margin: 0 }}>{topic}</p>
        </div>
        <button onClick={() => navigate(-1)}
          style={{ width: "100%", height: "52px", borderRadius: "14px", background: "#0F766E", color: "#FFFFFF", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(15,118,110,0.3)" }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <PageHeader title="Contact Support" />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-5">

          {/* Direct contact channels */}
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "0 0 10px" }}>CONTACT US DIRECTLY</p>
            <div className="flex flex-col gap-2">
              <a href="mailto:support@parkingph.com" style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", cursor: "pointer" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail size={18} style={{ color: "#0F766E" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Email Support</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#0F766E", margin: 0 }}>support@parkingph.com</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "#CBD5E1" }} />
                </div>
              </a>
              <a href="tel:+6328001234" style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", cursor: "pointer" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Phone size={18} style={{ color: "#0F766E" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Hotline</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", color: "#0F766E", margin: 0 }}>+63 2 800 1234</p>
                    <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8", margin: "1px 0 0" }}>Mon–Fri, 8:00 AM – 6:00 PM</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "#CBD5E1" }} />
                </div>
              </a>
            </div>
          </div>

          {/* Send a message form */}
          <div>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "12px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.6px", margin: "0 0 10px" }}>SEND US A MESSAGE</p>
            <div className="flex flex-col gap-3">
              {/* Topic picker */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Topic</label>
                <button onClick={() => setShowTopicList(!showTopicList)}
                  className="flex items-center justify-between px-4"
                  style={{ height: "52px", background: "#FFFFFF", border: `2px solid ${topic ? "#0F766E" : "#E2E8F0"}`, borderRadius: "14px", cursor: "pointer" }}>
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} style={{ color: "#94A3B8", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: topic ? "#1E293B" : "#94A3B8" }}>
                      {topic || "Select a topic"}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: "#64748B", transform: showTopicList ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {showTopicList && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                    {TOPICS.map(t => (
                      <button key={t} onClick={() => { setTopic(t); setShowTopicList(false); }}
                        className="w-full flex items-center justify-between px-4 py-3"
                        style={{ background: topic === t ? "#F0FDFA" : "#FFFFFF", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: topic === t ? "#0F766E" : "#1E293B", fontWeight: topic === t ? 600 : 400 }}>{t}</span>
                        {topic === t && <Check size={14} style={{ color: "#0F766E" }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", fontWeight: 500, color: "#374151" }}>Message</label>
                <textarea
                  placeholder="Describe your issue or question in detail…"
                  value={message} onChange={e => setMessage(e.target.value)} rows={5}
                  style={{ width: "100%", borderRadius: "14px", padding: "14px", resize: "none", fontFamily: "'Poppins', sans-serif", fontSize: "14px", color: "#1E293B", background: "#FFFFFF", border: `2px solid ${message.trim().length >= 10 ? "#0F766E" : "#E2E8F0"}`, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", lineHeight: 1.6 }}
                />
                <div className="flex justify-between">
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "#94A3B8" }}>Minimum 10 characters</span>
                  <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: message.length > 0 ? "#0F766E" : "#94A3B8" }}>{message.length}/500</span>
                </div>
              </div>

              <button onClick={() => canSend && setSent(true)} disabled={!canSend}
                style={{ height: "52px", borderRadius: "14px", background: canSend ? "#0F766E" : "#E2E8F0", color: canSend ? "#FFFFFF" : "#94A3B8", fontFamily: "'Poppins', sans-serif", fontSize: "16px", fontWeight: 500, border: "none", cursor: canSend ? "pointer" : "not-allowed", boxShadow: canSend ? "0 6px 20px rgba(15,118,110,0.3)" : "none", transition: "all 0.2s" }}>
                Send Message
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
