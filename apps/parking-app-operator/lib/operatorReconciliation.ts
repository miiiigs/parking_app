import { normalizeSlotStatus, type SlotSourceStatus } from './operatorDashboardMetrics.ts';

export type ReconciliationSlotRow = {
  id: string;
  slot_label: string;
  status: SlotSourceStatus;
};

export type ReconciliationReservationRow = {
  slot_id: string;
  status: string;
};

export type ReconciliationSessionRow = {
  slot_id: string;
  status: string;
};

export type ReconciliationFix = {
  slot_id: string;
  slot_label: string;
  previous_status: SlotSourceStatus;
  fixed_status: 'available' | 'reserved' | 'occupied' | 'blocked';
  reason: string;
};

export function buildScopedReconciliationPlan({
  slotRows,
  reservationRows,
  sessionRows,
}: {
  slotRows: ReconciliationSlotRow[];
  reservationRows: ReconciliationReservationRow[];
  sessionRows: ReconciliationSessionRow[];
}) {
  const activeSessionSlotIds = new Set(
    sessionRows.filter((session) => session.status === 'active').map((session) => session.slot_id),
  );
  const confirmedReservationSlotIds = new Set(
    reservationRows.filter((reservation) => reservation.status === 'confirmed').map((reservation) => reservation.slot_id),
  );

  const fixes: ReconciliationFix[] = slotRows
    .map((slot) => {
      const fixedStatus = normalizeSlotStatus({
        rawStatus: slot.status,
        hasActiveSession: activeSessionSlotIds.has(slot.id),
        hasConfirmedReservation: confirmedReservationSlotIds.has(slot.id),
      });

      if (fixedStatus === (slot.status === 'blocked' || slot.status === 'disputed' ? 'blocked' : slot.status)) {
        return null;
      }

      const reason = activeSessionSlotIds.has(slot.id)
        ? 'active session'
        : confirmedReservationSlotIds.has(slot.id)
          ? 'confirmed reservation'
          : slot.status === 'blocked' || slot.status === 'disputed'
            ? 'blocked state'
            : 'availability reset';

      return {
        slot_id: slot.id,
        slot_label: slot.slot_label,
        previous_status: slot.status,
        fixed_status: fixedStatus,
        reason,
      };
    })
    .filter((fix): fix is ReconciliationFix => Boolean(fix));

  return {
    mismatchCount: fixes.length,
    fixedCount: fixes.length,
    fixes,
  };
}
