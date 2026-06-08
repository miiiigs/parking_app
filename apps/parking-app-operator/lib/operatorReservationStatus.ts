import type { Reservation } from './types';

export type ReservationSourceStatus = string;

export type ReservationStatusContext = {
  rawStatus: ReservationSourceStatus;
  linkedSessionStatus?: string | null;
  expiresAt?: string | null;
  now?: Date;
};

export function deriveReservationStatus({
  rawStatus,
  linkedSessionStatus,
  expiresAt,
  now = new Date(),
}: ReservationStatusContext): Reservation['status'] {
  if (linkedSessionStatus === 'completed') {
    return 'completed';
  }

  if (linkedSessionStatus === 'active') {
    return 'active';
  }

  if (rawStatus === 'completed') {
    return 'completed';
  }

  if (rawStatus === 'no_show' || rawStatus === 'expired') {
    return 'no-show';
  }

  if (expiresAt) {
    const expiresDate = new Date(expiresAt);
    if (!Number.isNaN(expiresDate.getTime()) && expiresDate.getTime() <= now.getTime()) {
      return 'no-show';
    }
  }

  return 'active';
}

export function deriveReservationPaymentStatus(status: string): Reservation['paymentStatus'] {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}
