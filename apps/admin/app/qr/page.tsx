import QRCode from 'react-qr-code';

const slotRows = Array.from({ length: 20 }, (_, index) => {
  const slotNumber = index + 1;

  return {
    id: slotNumber,
    label: `Slot #${slotNumber}`,
    token: `bgc-pilot-slot-${slotNumber}`,
  };
});

export default function QRPage() {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
      <section style={{ display: 'grid', gap: 18, marginBottom: 28 }}>
        <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 12, fontWeight: 700 }}>
          Slot QR Codes
        </p>
        <h1 style={{ fontSize: 40, lineHeight: 1.05, margin: 0 }}>Generate reusable QR codes for each slot.</h1>
        <p style={{ maxWidth: 820, color: '#a9bdd6', fontSize: 18, lineHeight: 1.6, margin: 0 }}>
          Each QR encodes a static slot token. You print it once and reuse it for every future reservation for that slot.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {slotRows.map((slot) => (
          <article
            key={slot.id}
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
            <div style={{ fontWeight: 800, fontSize: 20 }}>{slot.label}</div>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 16 }}>
              <QRCode value={slot.token} size={160} />
            </div>
            <div style={{ color: '#7f94ad', fontSize: 12, textAlign: 'center', wordBreak: 'break-all' }}>{slot.token}</div>
            <div style={{ color: '#a9bdd6', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              Print, laminate, and place this on the assigned parking slot.
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}