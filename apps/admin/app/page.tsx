import Link from 'next/link';

import { resetDemoData, resetParkingSlots, updateSlotStatus } from './actions';
import { DashboardLiveRefresh } from './DashboardLiveRefresh';
import { getFallbackAdminDashboardData, loadAdminDashboardData } from '../lib/dashboard';

const statusTheme = {
  available: { background: '#0c1a28', border: '#3dd6a5', text: '#3dd6a5' },
  reserved: { background: '#0d1a2a', border: '#7bd3ff', text: '#7bd3ff' },
  occupied: { background: '#23190c', border: '#ffb74d', text: '#ffb74d' },
  blocked: { background: '#281214', border: '#ff8a80', text: '#ff8a80' },
  // disputed: { background: '#20142a', border: '#d1a3ff', text: '#d1a3ff' },
} as const;

const stateDescriptions = [
  {
    status: 'reserved' as const,
    title: 'Reserved',
    description: 'Booked in the app. The driver is on the way but has not parked yet.',
  },
  {
    status: 'occupied' as const,
    title: 'Occupied',
    description: 'The vehicle is physically parked and the live session is active.',
  },
  {
    status: 'blocked' as const,
    title: 'Blocked / Disputed',
    description: 'Temporarily unavailable or under review. Use this when the slot has a maintenance issue, staff hold, or a dispute that needs resolution.',
  },
];

function getStatusBadgeStyle(status: keyof typeof statusTheme) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${statusTheme[status].border}`,
    background: statusTheme[status].background,
    color: statusTheme[status].text,
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  };
}

function getStatusButtonStyle(targetStatus: keyof typeof statusTheme, currentStatus: keyof typeof statusTheme) {
  const isCurrent = targetStatus === currentStatus;

  return {
    background: isCurrent ? statusTheme[targetStatus].border : '#1a2e49',
    color: isCurrent ? '#071018' : '#f4f7fb',
    border: `1px solid ${isCurrent ? statusTheme[targetStatus].border : '#26405f'}`,
    borderRadius: 10,
    padding: '8px 10px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: isCurrent ? `0 0 0 2px ${statusTheme[targetStatus].border}22` : 'none',
  } as const;
}

export default async function Page() {
  const dashboardData = (await loadAdminDashboardData()) ?? getFallbackAdminDashboardData();

  const slots = dashboardData.slots;

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
        <div style={{ color: '#a9bdd6', fontSize: 14, lineHeight: 1.6 }}>
          Active location: <strong style={{ color: '#f4f7fb' }}>{dashboardData.location?.name ?? 'BGC Pilot Site'}</strong>
          {dashboardData.location?.address ? ` · ${dashboardData.location.address}` : ''}
        </div>
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
          <DashboardLiveRefresh />
          <form action={resetParkingSlots}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: 12,
                background: '#ff8a80',
                color: '#1b0c0d',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reset Slot Statuses
            </button>
          </form>
          <form action={resetDemoData}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: 12,
                background: '#ff5d5d',
                color: '#1b0c0d',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Full Demo Reset
            </button>
          </form>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          ['Active Reservations', String(dashboardData.metrics.activeReservations)],
          ['Occupied Slots', String(dashboardData.metrics.occupiedSlots)],
          ['Completed Sessions', String(dashboardData.metrics.completedSessions)],
          ['No-Shows Today', String(dashboardData.metrics.noShowsToday)],
          ['Revenue', `PHP ${dashboardData.metrics.revenue.toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#0f1b2c', borderRadius: 20, padding: 20, border: '1px solid #18283f' }}>
            <div style={{ color: '#7f94ad', fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ background: '#0f1b2c', borderRadius: 24, padding: 24, border: '1px solid #18283f', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Live Reservations</h2>
            <p style={{ margin: '6px 0 0', color: '#a9bdd6' }}>Recent bookings currently in the system.</p>
          </div>
          <div style={{ color: '#7bd3ff', fontWeight: 700 }}>{dashboardData.reservations.length} records</div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {dashboardData.reservations.map((reservation) => (
            <div
              key={reservation.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: 12,
                alignItems: 'center',
                padding: '16px 18px',
                borderRadius: 16,
                background: '#08111d',
                border: '1px solid #18283f',
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{reservation.slotLabel}</div>
                <div style={{ color: '#a9bdd6', fontSize: 13 }}>{reservation.plateNumber}</div>
                <div style={{ color: '#7f94ad', fontSize: 12 }}>Expires {new Date(reservation.expiresAt).toLocaleTimeString()}</div>
              </div>
              <div style={{ color: '#7bd3ff', fontWeight: 700 }}>{reservation.status}</div>
              <div style={{ color: '#f4f7fb', fontWeight: 700 }}>PHP {reservation.reservationFee.toFixed(2)}</div>
              <div style={{ color: '#a9bdd6', fontSize: 13 }}>Window {reservation.arrivalWindowMinutes} mins</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#0f1b2c', borderRadius: 24, padding: 24, border: '1px solid #18283f' }}>
        <h2 style={{ marginTop: 0 }}>Slot Board</h2>
        <p style={{ color: '#a9bdd6', marginTop: -6, marginBottom: 18 }}>
          The status here mirrors the same reusable QR tokens printed on each physical slot.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {stateDescriptions.map((state) => (
            <div
              key={state.title}
              style={{
                background: '#08111d',
                border: `1px solid ${statusTheme[state.status].border}`,
                borderRadius: 16,
                padding: 16,
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ ...getStatusBadgeStyle(state.status), justifySelf: 'start' }}>{state.title}</div>
              <div style={{ color: '#a9bdd6', fontSize: 13, lineHeight: 1.5 }}>{state.description}</div>
            </div>
          ))}
        </div>
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
                <div style={{ fontWeight: 700 }}>{slot.slotLabel}</div>
                <div style={{ color: '#7f94ad', fontSize: 12, wordBreak: 'break-all' }}>{slot.qrToken}</div>
              </div>
              <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                <div style={getStatusBadgeStyle(slot.status)}>{slot.status}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(['available', 'occupied', 'blocked'] as const).map((status) => (
                    <form key={status} action={updateSlotStatus}>
                      <input type="hidden" name="slotId" value={slot.id} />
                      <input type="hidden" name="status" value={status} />
                      <input type="hidden" name="redirectTo" value="/" />
                      <button type="submit" style={getStatusButtonStyle(status, slot.status)}>
                        {status}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
