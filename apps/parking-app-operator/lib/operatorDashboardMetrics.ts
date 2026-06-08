import type { ParkingSlot } from './types';

export type SlotSourceStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';

export type NormalizedSlotStatus = 'available' | 'reserved' | 'occupied' | 'blocked';

export type OperatorMetricReservation = {
  status: string;
};

export type OperatorMetricSession = {
  started_at: string;
  ended_at: string | null;
  billed_minutes: number | null;
  status: string;
};

export type OperatorMetricPayment = {
  status: string;
  amount: number;
};

export function normalizeSlotStatus({
  rawStatus,
  hasActiveSession,
  hasConfirmedReservation,
}: {
  rawStatus: SlotSourceStatus;
  hasActiveSession: boolean;
  hasConfirmedReservation: boolean;
}) {
  if (hasActiveSession) {
    return 'occupied' as const;
  }

  if (hasConfirmedReservation) {
    return 'reserved' as const;
  }

  if (rawStatus === 'blocked' || rawStatus === 'disputed') {
    return 'blocked' as const;
  }

  if (rawStatus === 'occupied') {
    return 'occupied' as const;
  }

  if (rawStatus === 'reserved') {
    return 'reserved' as const;
  }

  return 'available' as const;
}

export function mapOperatorSlotStatus(status: NormalizedSlotStatus): ParkingSlot['status'] {
  return status === 'blocked' ? 'maintenance' : status;
}

export function buildGridSlots(
  slotRows: Array<{ id: string; slot_label: string; status: NormalizedSlotStatus }>,
): ParkingSlot[] {
  const columns = 6;
  const slotWidth = 92;
  const slotHeight = 76;
  const spacing = 14;

  return slotRows.map((slot, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      id: slot.id,
      slotNumber: slot.slot_label,
      status: mapOperatorSlotStatus(slot.status),
      x: column * (slotWidth + spacing),
      y: row * (slotHeight + spacing),
      width: slotWidth,
      height: slotHeight,
      rotation: 0,
      vehicleType: 'standard' as const,
    };
  });
}

export function buildOperatorDashboardMetrics({
  reservations,
  operatorSlotCount,
  occupiedSlotCount,
  slotRows,
  normalizedSlotRows,
  completedSessionRows,
  paymentRows,
}: {
  reservations: OperatorMetricReservation[];
  operatorSlotCount: number;
  occupiedSlotCount: number;
  slotRows: Array<{ id: string; status: SlotSourceStatus }>;
  normalizedSlotRows: Array<{ id: string; status: NormalizedSlotStatus }>;
  completedSessionRows: OperatorMetricSession[];
  paymentRows: OperatorMetricPayment[];
}) {
  const totalRevenue = paymentRows.reduce(
    (sum, payment) => sum + (payment.status === 'paid' ? Number(payment.amount ?? 0) : 0),
    0,
  );

  const dataMismatches = slotRows.filter((slot) => {
    const normalizedStatus = normalizedSlotRows.find((candidate) => candidate.id === slot.id)?.status ?? 'available';
    return normalizedStatus !== (slot.status === 'blocked' || slot.status === 'disputed' ? 'blocked' : slot.status);
  }).length;

  return {
    activeReservations: reservations.filter((reservation) => reservation.status === 'active').length,
    occupiedSlots: occupiedSlotCount,
    completedSessions: completedSessionRows.length,
    noShows: reservations.filter((reservation) => reservation.status === 'no-show').length,
    dataMismatches,
    totalRevenue,
    occupancyRate: operatorSlotCount ? Math.round((occupiedSlotCount / operatorSlotCount) * 1000) / 10 : 0,
    averageSessionDuration:
      completedSessionRows.length > 0
        ? Math.round(
            (completedSessionRows.reduce((total, session) => {
              if (session.ended_at) {
                return total + (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000;
              }

              return total + Number(session.billed_minutes ?? 0);
            }, 0) /
              completedSessionRows.length) *
              10,
          ) / 10
        : 0,
  };
}
