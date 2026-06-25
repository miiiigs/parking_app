import type { CustomerOversightItem, PaymentRecord } from './types';

type CustomerReservationRow = {
  id: string;
  user_id: string;
  slot_id: string;
  plate_number: string | null;
  status: string;
  reserved_at: string;
  expires_at: string | null;
};

type CustomerSessionRow = {
  id: string;
  reservation_id: string | null;
  slot_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
};

type CustomerPaymentRow = {
  id: string;
  reservation_id: string | null;
  session_id: string | null;
  status: string;
  amount: number | null;
  created_at: string;
  paid_at: string | null;
};

type CustomerAuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
};

type CustomerDashboardAccount = {
  user_id: string;
  display_name: string | null;
  role: 'admin' | 'operator' | 'support' | 'finance';
};

type CustomerOversightInput = {
  reservations: CustomerReservationRow[];
  sessions: CustomerSessionRow[];
  payments: CustomerPaymentRow[];
  slotLocationBySlotId: Map<string, { id: string; name: string }>;
  authUsersById: Map<string, CustomerAuthUser>;
  dashboardAccountsByUserId: Map<string, CustomerDashboardAccount>;
  now?: Date;
};

type CustomerAggregate = {
  userId: string;
  reservationCount: number;
  activeReservationCount: number;
  completedReservationCount: number;
  noShowReservationCount: number;
  activeSessionCount: number;
  completedSessionCount: number;
  latestReservationAt: string | null;
  latestSessionAt: string | null;
  latestPaymentStatus: PaymentRecord['status'] | null;
  latestPaymentAmount: number | null;
  latestPaidAt: string | null;
  latestPaymentSeenAt: string | null;
  latestActivityAt: string | null;
  plateLastSeenAt: Map<string, number>;
  locationLastSeenAt: Map<string, { id: string; name: string; seenAt: number }>;
};

function deriveCustomerReservationStatus({
  rawStatus,
  linkedSessionStatus,
  expiresAt,
  now,
}: {
  rawStatus: string;
  linkedSessionStatus?: string | null;
  expiresAt?: string | null;
  now: Date;
}) {
  if (linkedSessionStatus === 'completed') {
    return 'completed' as const;
  }

  if (linkedSessionStatus === 'active') {
    return 'active' as const;
  }

  if (rawStatus === 'completed') {
    return 'completed' as const;
  }

  if (rawStatus === 'no_show' || rawStatus === 'expired') {
    return 'no-show' as const;
  }

  if (expiresAt) {
    const expiresDate = new Date(expiresAt);
    if (!Number.isNaN(expiresDate.getTime()) && expiresDate.getTime() <= now.getTime()) {
      return 'no-show' as const;
    }
  }

  return 'active' as const;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function maxIsoTimestamp(current: string | null, candidate: string | null | undefined) {
  const currentValue = toTimestamp(current);
  const candidateValue = toTimestamp(candidate);

  if (candidateValue === null) {
    return current;
  }

  if (currentValue === null || candidateValue > currentValue) {
    return candidate ?? null;
  }

  return current;
}

function normalizePaymentStatus(status: string): PaymentRecord['status'] {
  if (status === 'paid' || status === 'completed') {
    return 'completed';
  }

  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'refunded') {
    return 'refunded';
  }

  return 'pending';
}

function ensureAggregate(store: Map<string, CustomerAggregate>, userId: string) {
  const existing = store.get(userId);
  if (existing) {
    return existing;
  }

  const created: CustomerAggregate = {
    userId,
    reservationCount: 0,
    activeReservationCount: 0,
    completedReservationCount: 0,
    noShowReservationCount: 0,
    activeSessionCount: 0,
    completedSessionCount: 0,
    latestReservationAt: null,
    latestSessionAt: null,
    latestPaymentStatus: null,
    latestPaymentAmount: null,
    latestPaidAt: null,
    latestPaymentSeenAt: null,
    latestActivityAt: null,
    plateLastSeenAt: new Map<string, number>(),
    locationLastSeenAt: new Map<string, { id: string; name: string; seenAt: number }>(),
  };

  store.set(userId, created);
  return created;
}

function updateLocationSeenAt(
  aggregate: CustomerAggregate,
  location: { id: string; name: string } | undefined,
  candidateTimestamp: string | null | undefined,
) {
  if (!location) {
    return;
  }

  const seenAt = toTimestamp(candidateTimestamp);
  if (seenAt === null) {
    return;
  }

  const current = aggregate.locationLastSeenAt.get(location.id);
  if (!current || seenAt > current.seenAt) {
    aggregate.locationLastSeenAt.set(location.id, { ...location, seenAt });
  }
}

export function buildCustomerOversightItems({
  reservations,
  sessions,
  payments,
  slotLocationBySlotId,
  authUsersById,
  dashboardAccountsByUserId,
  now = new Date(),
}: CustomerOversightInput): CustomerOversightItem[] {
  const aggregates = new Map<string, CustomerAggregate>();
  const reservationUserById = new Map(reservations.map((reservation) => [reservation.id, reservation.user_id]));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const sessionByReservationId = new Map(
    sessions
      .filter((session) => Boolean(session.reservation_id))
      .map((session) => [session.reservation_id as string, session]),
  );

  for (const reservation of reservations) {
    const aggregate = ensureAggregate(aggregates, reservation.user_id);
    const linkedSession = sessionByReservationId.get(reservation.id) ?? null;
    const derivedStatus = deriveCustomerReservationStatus({
      rawStatus: reservation.status,
      linkedSessionStatus: linkedSession?.status ?? null,
      expiresAt: reservation.expires_at,
      now,
    });

    aggregate.reservationCount += 1;
    if (derivedStatus === 'active') {
      aggregate.activeReservationCount += 1;
    } else if (derivedStatus === 'completed') {
      aggregate.completedReservationCount += 1;
    } else {
      aggregate.noShowReservationCount += 1;
    }

    aggregate.latestReservationAt = maxIsoTimestamp(aggregate.latestReservationAt, reservation.reserved_at);
    aggregate.latestActivityAt = maxIsoTimestamp(aggregate.latestActivityAt, reservation.reserved_at);

    const location = slotLocationBySlotId.get(reservation.slot_id);
    updateLocationSeenAt(aggregate, location, reservation.reserved_at);

    if (reservation.plate_number) {
      const seenAt = toTimestamp(reservation.reserved_at);
      if (seenAt !== null) {
        const current = aggregate.plateLastSeenAt.get(reservation.plate_number);
        if (current === undefined || seenAt > current) {
          aggregate.plateLastSeenAt.set(reservation.plate_number, seenAt);
        }
      }
    }
  }

  for (const session of sessions) {
    const reservationUserId = session.reservation_id ? reservationUserById.get(session.reservation_id) ?? null : null;
    if (!reservationUserId) {
      continue;
    }

    const aggregate = ensureAggregate(aggregates, reservationUserId);
    aggregate.latestSessionAt = maxIsoTimestamp(aggregate.latestSessionAt, session.started_at);
    aggregate.latestActivityAt = maxIsoTimestamp(aggregate.latestActivityAt, session.started_at);
    aggregate.latestActivityAt = maxIsoTimestamp(aggregate.latestActivityAt, session.ended_at);

    if (session.status === 'active') {
      aggregate.activeSessionCount += 1;
    } else if (session.status === 'completed') {
      aggregate.completedSessionCount += 1;
    }

    const location = slotLocationBySlotId.get(session.slot_id);
    updateLocationSeenAt(aggregate, location, session.started_at);
    updateLocationSeenAt(aggregate, location, session.ended_at);
  }

  for (const payment of payments) {
    const userId =
      (payment.reservation_id ? reservationUserById.get(payment.reservation_id) ?? null : null)
      ?? (payment.session_id
        ? (() => {
            const session = sessionById.get(payment.session_id);
            return session?.reservation_id ? reservationUserById.get(session.reservation_id) ?? null : null;
          })()
        : null);

    if (!userId) {
      continue;
    }

    const aggregate = ensureAggregate(aggregates, userId);
    const paymentSeenAt = payment.paid_at ?? payment.created_at;
    const paymentSeenAtValue = toTimestamp(paymentSeenAt);
    const currentLatestPaymentSeenAt = toTimestamp(aggregate.latestPaymentSeenAt);

    aggregate.latestActivityAt = maxIsoTimestamp(aggregate.latestActivityAt, payment.created_at);
    aggregate.latestActivityAt = maxIsoTimestamp(aggregate.latestActivityAt, payment.paid_at);

    if (
      paymentSeenAtValue !== null
      && (currentLatestPaymentSeenAt === null || paymentSeenAtValue > currentLatestPaymentSeenAt)
    ) {
      aggregate.latestPaymentStatus = normalizePaymentStatus(payment.status);
      aggregate.latestPaymentAmount = payment.amount !== null ? Number(payment.amount) : null;
      aggregate.latestPaidAt = payment.paid_at;
      aggregate.latestPaymentSeenAt = paymentSeenAt;
    }
  }

  return Array.from(aggregates.values())
    .map((aggregate) => {
      const authUser = authUsersById.get(aggregate.userId);
      const dashboardAccount = dashboardAccountsByUserId.get(aggregate.userId);
      const visitedLocations = Array.from(aggregate.locationLastSeenAt.values()).sort((left, right) => right.seenAt - left.seenAt);
      const recentVehiclePlates = Array.from(aggregate.plateLastSeenAt.entries())
        .sort((left, right) => right[1] - left[1])
        .map(([plate]) => plate)
        .slice(0, 3);

      return {
        userId: aggregate.userId,
        displayName: authUser?.displayName ?? dashboardAccount?.display_name ?? null,
        email: authUser?.email ?? null,
        phone: authUser?.phone ?? null,
        dashboardRole: dashboardAccount?.role ?? null,
        hasDashboardAccess: Boolean(dashboardAccount),
        latestLocationId: visitedLocations[0]?.id ?? null,
        latestLocationName: visitedLocations[0]?.name ?? null,
        visitedLocationNames: visitedLocations.map((location) => location.name).slice(0, 3),
        recentVehiclePlates,
        totalReservations: aggregate.reservationCount,
        activeReservations: aggregate.activeReservationCount,
        completedReservations: aggregate.completedReservationCount,
        noShowReservations: aggregate.noShowReservationCount,
        activeSessions: aggregate.activeSessionCount,
        completedSessions: aggregate.completedSessionCount,
        latestReservationAt: aggregate.latestReservationAt,
        latestSessionAt: aggregate.latestSessionAt,
        latestPaymentStatus: aggregate.latestPaymentStatus,
        latestPaymentAmount: aggregate.latestPaymentAmount,
        latestPaidAt: aggregate.latestPaidAt,
        latestActivityAt: aggregate.latestActivityAt,
      } satisfies CustomerOversightItem;
    })
    .sort((left, right) => {
      const rightActivity = toTimestamp(right.latestActivityAt) ?? 0;
      const leftActivity = toTimestamp(left.latestActivityAt) ?? 0;

      if (rightActivity !== leftActivity) {
        return rightActivity - leftActivity;
      }

      if (right.totalReservations !== left.totalReservations) {
        return right.totalReservations - left.totalReservations;
      }

      return left.userId.localeCompare(right.userId);
    });
}
