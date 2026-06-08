export type ScopedReservation = {
  id: string;
  slotId: string | null;
};

export type ScopedSession = {
  id: string;
  reservationId: string | null;
  slotId: string | null;
};

export type ScopedPayment = {
  id: string;
  reservationId: string | null;
  sessionId: string | null;
};

export type ScopedOperatorEvent = {
  id: string;
  slotId: string | null;
  reservationId?: string | null;
  sessionId?: string | null;
  payload?: Record<string, unknown> | null;
};

export function buildLocationScopedAdminResetTargets({
  locationId,
  locationSlotIds,
  reservations,
  sessions,
  payments,
  operatorEvents,
}: {
  locationId: string;
  locationSlotIds: string[];
  reservations: ScopedReservation[];
  sessions: ScopedSession[];
  payments: ScopedPayment[];
  operatorEvents: ScopedOperatorEvent[];
}) {
  const slotIdSet = new Set(locationSlotIds);
  const reservationIds = reservations.filter((reservation) => reservation.slotId && slotIdSet.has(reservation.slotId)).map((reservation) => reservation.id);
  const reservationIdSet = new Set(reservationIds);
  const sessionIds = sessions
    .filter((session) => {
      if (session.slotId && slotIdSet.has(session.slotId)) {
        return true;
      }

      return session.reservationId ? reservationIdSet.has(session.reservationId) : false;
    })
    .map((session) => session.id);
  const sessionIdSet = new Set(sessionIds);
  const paymentIds = payments
    .filter((payment) => {
      if (payment.reservationId && reservationIdSet.has(payment.reservationId)) {
        return true;
      }

      return payment.sessionId ? sessionIdSet.has(payment.sessionId) : false;
    })
    .map((payment) => payment.id);
  const operatorEventIds = operatorEvents
    .filter((event) => {
      if (event.slotId && slotIdSet.has(event.slotId)) {
        return true;
      }

      if (event.reservationId && reservationIdSet.has(event.reservationId)) {
        return true;
      }

      if (event.sessionId && sessionIdSet.has(event.sessionId)) {
        return true;
      }

      const payloadLocationId =
        typeof event.payload?.location_id === 'string'
          ? event.payload.location_id
          : typeof event.payload?.locationId === 'string'
            ? event.payload.locationId
            : null;

      return payloadLocationId === locationId;
    })
    .map((event) => event.id);

  return {
    slotIds: locationSlotIds,
    reservationIds,
    sessionIds,
    paymentIds,
    operatorEventIds,
  };
}
