import Link from 'next/link';

import { resetDemoData, resetParkingSlots, runParkingReconciliation, signOutAdmin, updateSlotStatus } from './actions';
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
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px 56px', display: 'grid', gap: 24 }}>
      <section
        style={{
          display: 'grid',
          gap: 22,
          padding: 28,
          borderRadius: 28,
          border: '1px solid #18283f',
          background: 'linear-gradient(180deg, #12233a 0%, #0f1b2c 100%)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
            <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 12, fontWeight: 700, margin: 0 }}>
              Operator Dashboard
            </p>
            <h1 style={{ fontSize: 48, lineHeight: 1.02, margin: 0 }}>Parking control built for live operations.</h1>
            <p style={{ color: '#a9bdd6', fontSize: 18, lineHeight: 1.6, margin: 0 }}>
              Monitor reservations, resolve conflicts, and keep slot state accurate across the property.
            </p>
          </div>
          <div
            style={{
              minWidth: 240,
              padding: 16,
              borderRadius: 20,
              background: '#08111d',
              border: '1px solid #18283f',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ color: '#7f94ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 800 }}>
              Active Location
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{dashboardData.location?.name ?? 'BGC Pilot Site'}</div>
            <div style={{ color: '#a9bdd6', fontSize: 13, lineHeight: 1.5 }}>
              {dashboardData.location?.address ?? 'Bonifacio Global City, Taguig'}
            </div>
            <div style={{ color: '#3dd6a5', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {dashboardData.metrics.activeReservations} active reservations
            </div>
          </div>
        </div>
        <div style={{ color: '#a9bdd6', fontSize: 14, lineHeight: 1.6 }}>
          Keep the QR board, slot states, and reconciliation in sync from one place.
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
          <form action={signOutAdmin}>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: 12,
                background: '#1a2e49',
                color: '#f4f7fb',
                fontWeight: 800,
                border: '1px solid #26405f',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </form>
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
          <form action={runParkingReconciliation}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 16px',
                borderRadius: 12,
                background: '#7bd3ff',
                color: '#071018',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Run Reconciliation
            </button>
          </form>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          ['Active Reservations', String(dashboardData.metrics.activeReservations)],
          ['Occupied Slots', String(dashboardData.metrics.occupiedSlots)],
          ['Completed Sessions', String(dashboardData.metrics.completedSessions)],
          ['No-Shows Today', String(dashboardData.metrics.noShowsToday)],
          ['Data Mismatches', String(dashboardData.metrics.dataIntegrityMismatches)],
          ['Revenue', `PHP ${dashboardData.metrics.revenue.toFixed(2)}`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: 'linear-gradient(180deg, #101d2e 0%, #0a1320 100%)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid #18283f',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.14)',
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ color: '#7f94ad', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
          </div>
        ))}
      </section>

      <section style={{ background: '#0f1b2c', borderRadius: 24, padding: 24, border: '1px solid #18283f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Live Reservations</h2>
            <p style={{ margin: 0, color: '#a9bdd6' }}>Recent bookings currently in the system.</p>
          </div>
          <div style={{ color: '#7bd3ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12 }}>
            {dashboardData.reservations.length} records
          </div>
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
                background: 'linear-gradient(180deg, #0a1320 0%, #08111d 100%)',
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
        <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>Slot Board</h2>
          <p style={{ color: '#a9bdd6', margin: 0 }}>
          The status here mirrors the same reusable QR tokens printed on each physical slot.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {stateDescriptions.map((state) => (
            <div
              key={state.title}
              style={{
                background: 'linear-gradient(180deg, #0a1320 0%, #08111d 100%)',
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

      <section style={{ background: '#0f1b2c', borderRadius: 24, padding: 24, border: '1px solid #18283f' }}>
        <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>Production Health</h2>
          <p style={{ color: '#a9bdd6', margin: 0 }}>
          Audit trail, reconciliation activity, and integrity signals for operators.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 18 }}>
          {[
            ['Latest Audit Events', String(dashboardData.auditEvents.length)],
            ['Recent Reconciliations', String(dashboardData.reconciliationRuns.length)],
            ['Open Mismatches', String(dashboardData.metrics.dataIntegrityMismatches)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: 'linear-gradient(180deg, #0a1320 0%, #08111d 100%)',
                borderRadius: 18,
                padding: 18,
                border: '1px solid #18283f',
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ color: '#7f94ad', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 800 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {dashboardData.reconciliationRuns.length === 0 ? (
            <div style={{ color: '#a9bdd6', fontSize: 14 }}>No reconciliation runs yet.</div>
          ) : null}
          {dashboardData.reconciliationRuns.map((run) => (
            <div
              key={run.id}
              style={{
                background: 'linear-gradient(180deg, #0a1320 0%, #08111d 100%)',
                borderRadius: 16,
                padding: 16,
                border: '1px solid #18283f',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>{run.runStatus.toUpperCase()}</strong>
                <span style={{ color: '#7f94ad' }}>{new Date(run.startedAt).toLocaleString()}</span>
              </div>
              <div style={{ color: '#a9bdd6', fontSize: 13, marginTop: 8 }}>
                Fixed {run.fixedCount} of {run.mismatchCount} mismatches
              </div>
              {run.message ? <div style={{ color: '#f4f7fb', fontSize: 13, marginTop: 6 }}>{run.message}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#0f1b2c', borderRadius: 24, padding: 24, border: '1px solid #18283f' }}>
        <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>Recent Audit Trail</h2>
          <p style={{ color: '#a9bdd6', margin: 0 }}>Latest database changes captured by the audit triggers.</p>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {dashboardData.auditEvents.length === 0 ? (
            <div style={{ color: '#a9bdd6', fontSize: 14 }}>No audit events yet.</div>
          ) : null}
          {dashboardData.auditEvents.map((event) => (
            <div
              key={event.id}
              style={{
                background: 'linear-gradient(180deg, #0a1320 0%, #08111d 100%)',
                borderRadius: 16,
                padding: 16,
                border: '1px solid #18283f',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>{event.tableName}</strong>
                <span style={{ color: '#7f94ad' }}>{new Date(event.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ color: '#a9bdd6', fontSize: 13, marginTop: 8 }}>
                Action: {event.action} · Record: {event.recordId ?? 'n/a'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
