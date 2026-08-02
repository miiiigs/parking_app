'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { recordOperatorActionFailure, recordOperatorActionSuccess } from '@/lib/operatorDataStore';
import type { ParkingSessionRecord, Reservation } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';
import { buildReservationEntryPass, buildWalkInEntryPass } from '@parking/shared';

type FeedbackTone = 'success' | 'warning' | 'error';

function feedbackClasses(tone: FeedbackTone) {
  switch (tone) {
    case 'success':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    default:
      return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
}

type ActionFeedback = {
  tone: FeedbackTone;
  message: string;
};

export function buildOperatorEntryPass(
  reservation: Pick<Reservation, 'id' | 'source'>,
  slotQrToken?: string | null,
) {
  return reservation.source === 'walk_in'
    ? null
    : buildReservationEntryPass({ reservationId: reservation.id, slotQrToken });
}

export function ReservationParkingActions({
  reservation,
}: {
  reservation: Pick<Reservation, 'id' | 'source' | 'status' | 'reservationId' | 'linkedSessionId' | 'slotId'>;
}) {
  const { data, refresh } = useOperatorData();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const slotQrToken = data?.parkingMap.slots.find((slot) => slot.id === reservation.slotId)?.qrToken ?? null;
  const entryPass = buildOperatorEntryPass(reservation, slotQrToken);
  const hasLinkedSession = Boolean(reservation.linkedSessionId);
  const canVerifyEntry = reservation.status === 'active' && Boolean(entryPass);

  async function handleVerifyEntry() {
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/operator/gate-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entryPass }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to verify entry QR.');
      }

      const idempotentReplay = Boolean(payload?.confirmation?.idempotent_replay);
      setFeedback({
        tone: idempotentReplay ? 'warning' : 'success',
        message: idempotentReplay
          ? 'Entry was already confirmed earlier. The active session was replayed safely.'
          : 'Entry QR verified. The reservation is now backed by an active parking session.',
      });
      recordOperatorActionSuccess();
      await refresh({ silent: true, force: true });
    } catch (error) {
      recordOperatorActionFailure();
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to verify entry QR.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => void handleVerifyEntry()}
          disabled={!canVerifyEntry || submitting}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Verify Entry QR
        </Button>
        <Button type="button" size="sm" variant="outline" asChild className="w-full sm:w-auto">
          <Link href={`/dashboard/parking-actions?reservationId=${encodeURIComponent(reservation.id)}&source=${encodeURIComponent(reservation.source)}`}>
            Open Parking Actions
          </Link>
        </Button>
        <Button type="button" size="sm" variant="outline" disabled className="w-full sm:w-auto">
          Verify Exit QR
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {reservation.source === 'walk_in'
          ? 'Walk-in entry now requires the customer QR because the one-time token is no longer reconstructable from the dashboard.'
          : hasLinkedSession
          ? 'Entry verification can be replayed safely if the operator needs to re-check the active session. Exit verification is still blocked until the backend exit contract exists.'
          : 'Use the direct entry verification button when scan hardware is unavailable. Exit verification is still blocked until the backend exit contract exists.'}
      </div>
      {feedback ? (
        <div className={`rounded-lg border px-3 py-2 text-xs ${feedbackClasses(feedback.tone)}`}>
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}

export function SessionParkingActions({
  session,
  reservation,
}: {
  session: Pick<ParkingSessionRecord, 'status'>;
  reservation: Pick<Reservation, 'id' | 'source'> | null;
}) {
  const canOpenParkingActions = Boolean(reservation);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" size="sm" variant="outline" asChild disabled={!canOpenParkingActions} className="w-full sm:w-auto">
          {canOpenParkingActions ? (
            <Link href={`/dashboard/parking-actions?reservationId=${encodeURIComponent(reservation!.id)}&source=${encodeURIComponent(reservation!.source)}`}>
              Open Parking Actions
            </Link>
          ) : (
            <span>Open Parking Actions</span>
          )}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled className="w-full sm:w-auto">
          Verify Exit QR
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {session.status === 'active'
          ? 'Manual exit verification is intentionally blocked for active sessions until the paid-exit authorization backend contract is implemented.'
          : 'This session can be inspected from Parking Actions, but exit verification remains blocked until the backend exit contract exists.'}
      </div>
    </div>
  );
}
