import QRCode from 'react-qr-code';

import { getFallbackAdminDashboardData, loadAdminDashboardData } from '../../lib/dashboard';

export default async function QRPage() {
  const dashboardData = (await loadAdminDashboardData()) ?? getFallbackAdminDashboardData();

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .qr-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <section style={{ display: 'grid', gap: 18, marginBottom: 28 }}>
        <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 12, fontWeight: 700 }}>
          Slot QR Codes
        </p>
        <h1 style={{ fontSize: 40, lineHeight: 1.05, margin: 0 }}>Generate reusable QR codes for each slot.</h1>
        <p style={{ maxWidth: 820, color: '#a9bdd6', fontSize: 18, lineHeight: 1.6, margin: 0 }}>
          Each QR encodes a static slot token. You print it once and reuse it for every future reservation for that slot.
        </p>
        <div style={{ color: '#a9bdd6', fontSize: 14, lineHeight: 1.6 }}>
          Printing for <strong style={{ color: '#f4f7fb' }}>{dashboardData.location?.name ?? 'BGC Pilot Site'}</strong>
        </div>
        <div className="no-print" style={{ color: '#a9bdd6', fontSize: 14, lineHeight: 1.6 }}>
          Use your browser print dialog. The layout below is optimized for paper sheets and reusable slot labels.
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {dashboardData.slots.map((slot) => (
          <article
            key={slot.id}
            className="qr-card"
            style={{
              background: '#0f1b2c',
              borderRadius: 24,
              padding: 20,
              border: '1px solid #18283f',
              display: 'grid',
              gap: 14,
              justifyItems: 'center',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 20 }}>{slot.slotLabel}</div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 16 }}>
              <QRCode value={slot.qrToken} size={160} />
            </div>
            <div style={{ color: '#7f94ad', fontSize: 12, textAlign: 'center', wordBreak: 'break-all' }}>{slot.qrToken}</div>
            <div style={{ color: '#a9bdd6', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              Print, laminate, and place this on the assigned parking slot.
            </div>
            <div style={{ color: '#7bd3ff', fontSize: 12, fontWeight: 700 }}>Reusable slot QR</div>
          </article>
        ))}
      </section>
    </main>
  );
}