import { PageHeader } from "../components/PageHeader";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: "We collect information you provide directly to us when you create an account, make a reservation, or contact us for support. This includes your name, phone number, vehicle information, and payment details.",
  },
  {
    title: "How We Use Your Information",
    body: "We use your information to provide, maintain, and improve our parking services; process transactions; send you technical notices and support messages; and respond to your comments and questions.",
  },
  {
    title: "Location Data",
    body: "With your permission, we collect location data to help you find nearby parking facilities. You may disable location access in your device settings at any time, though some features may be limited.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell your personal information. We may share your data with parking facility operators to fulfill your reservation, and with payment processors to complete transactions securely.",
  },
  {
    title: "Data Security",
    body: "We implement industry-standard security measures including encryption and secure servers to protect your personal information from unauthorized access, use, or disclosure.",
  },
  {
    title: "Data Retention",
    body: "We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.",
  },
  {
    title: "Your Rights",
    body: "You have the right to access, correct, or delete your personal information. To exercise these rights, contact us at privacy@parkingph.com or through the in-app support feature.",
  },
  {
    title: "Contact Us",
    body: "If you have questions about this Privacy Policy, please contact our Data Protection Officer at privacy@parkingph.com or write to us at ParkingPH, Bonifacio Global City, Taguig City, Philippines.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#FAFAF9" }}>
      <PageHeader title="Privacy Policy" />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="px-5 py-5 flex flex-col gap-5">
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #0F766E, #0D9488)" }}>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>Privacy Policy</p>
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.8)", margin: "4px 0 0" }}>Last updated: June 16, 2024</p>
          </div>
          {SECTIONS.map((s, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "14px", fontWeight: 700, color: "#0F766E", margin: "0 0 8px" }}>{s.title}</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
