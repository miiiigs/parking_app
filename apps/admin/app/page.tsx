import Link from 'next/link';

const slots = [
  { id: '12', status: 'Reserved', driver: 'Maria D.' },
  { id: '13', status: 'Available', driver: '-' },
  { id: '14', status: 'Occupied', driver: 'Josh T.' },
  { id: '15', status: 'Disputed', driver: 'Support needed' },
];

export default function Page() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
      <section style={{ display: 'grid', gap: 20, marginBottom: 24 }}>
        <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 12, fontWeight: 700 }}>
          Operator Dashboard
        </p>
        <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: 0 }}>Parking control built for live operations.</h1>
        <p style={{ maxWidth: 760, color: '#a9bdd6', fontSize: 18, lineHeight: 1.6, margin: 0 }}>
          Monitor reservations, resolve conflicts, and keep slot state accurate across the property.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/qr"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 16px',
              borderRadius: 12,
              background: '#3dd6a5',
              color: '#071018',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Print Slot QR Codes
          </Link>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          ['Active Reservations', '18'],
          ['Occupied Slots', '14'],
          ['No-Shows Today', '3'],
          ['Revenue', 'PHP 8,450'],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#0f1b2c', borderRadius: 20, padding: 20, border: '1px solid #18283f' }}>
            <div style={{ color: '#7f94ad', fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ background: '#0f1b2c', borderRadius: 24, padding: 24, border: '1px solid #18283f' }}>
        <h2 style={{ marginTop: 0 }}>Slot Board</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {slots.map((slot) => (
            <div
              key={slot.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 18px',
                borderRadius: 16,
                background: '#08111d',
                border: '1px solid #18283f',
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Slot #{slot.id}</div>
                <div style={{ color: '#7f94ad', fontSize: 14 }}>{slot.driver}</div>
              </div>
              <div style={{ color: '#7bd3ff', fontWeight: 700 }}>{slot.status}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
