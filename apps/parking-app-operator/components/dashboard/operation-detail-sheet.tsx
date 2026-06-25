'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ReservationParkingActions,
  SessionParkingActions,
} from '@/components/dashboard/parking-action-controls';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/formatCurrency';
import type {
  AuditLog,
  PaymentRecord,
  ParkingSessionRecord,
  Reservation,
} from '@/lib/types';

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reservationTone(status: Reservation['status']) {
  switch (status) {
    case 'active':
      return 'border-green-400/20 bg-green-500/10 text-green-300';
    case 'completed':
      return 'border-blue-400/20 bg-blue-500/10 text-blue-300';
    default:
      return 'border-red-400/20 bg-red-500/10 text-red-300';
  }
}

function sessionTone(status: ParkingSessionRecord['status']) {
  switch (status) {
    case 'active':
      return 'border-green-400/20 bg-green-500/10 text-green-300';
    case 'completed':
      return 'border-blue-400/20 bg-blue-500/10 text-blue-300';
    case 'cancelled':
    case 'expired':
      return 'border-red-400/20 bg-red-500/10 text-red-300';
    default:
      return 'border-slate-400/20 bg-slate-500/10 text-slate-200';
  }
}

function paymentTone(status: PaymentRecord['status'] | Reservation['paymentStatus']) {
  switch (status) {
    case 'completed':
      return 'border-green-400/20 bg-green-500/10 text-green-300';
    case 'failed':
    case 'refunded':
      return 'border-red-400/20 bg-red-500/10 text-red-300';
    default:
      return 'border-amber-400/20 bg-amber-500/10 text-amber-300';
  }
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">No linked audit history found.</div>;
  }

  return (
    <div className="space-y-3">
      {logs.slice(0, 12).map((log) => (
        <div key={log.id} className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-xs text-foreground">{log.action}</div>
              <div className="mt-1 text-xs text-muted-foreground">{log.operator}</div>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{log.details}</div>
        </div>
      ))}
    </div>
  );
}

function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) {
    return <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">No linked payments found.</div>;
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div key={payment.id} className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs text-foreground">{payment.paymentId}</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatCurrency(payment.amount)}</div>
            </div>
            <Badge className={`${paymentTone(payment.status)} border text-xs font-medium`}>
              {payment.status}
            </Badge>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>Created: {formatDateTime(payment.createdAt)}</div>
            <div>Paid: {formatDateTime(payment.paidAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReservationDetailSheet({
  open,
  onOpenChange,
  reservation,
  sessions,
  payments,
  auditLogs,
  onOpenSession,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
  sessions: ParkingSessionRecord[];
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
  onOpenSession?: (session: ParkingSessionRecord) => void;
}) {
  const linkedSession =
    reservation?.linkedSessionId
      ? sessions.find((session) => session.id === reservation.linkedSessionId) ?? null
      : null;
  const linkedPayments = reservation
    ? payments.filter(
        (payment) =>
          payment.reservationId === reservation.id ||
          (linkedSession ? payment.sessionId === linkedSession.id : false),
      )
    : [];
  const linkedAuditLogs = reservation
    ? auditLogs.filter(
        (log) =>
          log.reservationId === reservation.id ||
          (linkedSession ? log.sessionId === linkedSession.id : false) ||
          log.slotId === reservation.slotId,
      )
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border sm:max-w-2xl">
        {reservation ? (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle>{reservation.reservationId}</SheetTitle>
              <SheetDescription>
                Linked slot, payment, and audit history for this reservation.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-border text-xs font-medium">
                  {reservation.source === 'walk_in' ? 'Walk-In' : 'Reservation'}
                </Badge>
                <Badge className={`${reservationTone(reservation.status)} border text-xs font-medium`}>
                  {reservation.status}
                </Badge>
                <Badge className={`${paymentTone(reservation.paymentStatus)} border text-xs font-medium`}>
                  Payment {reservation.paymentStatus}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailBlock
                  label="Driver"
                  value={reservation.driverName || (reservation.source === 'walk_in' ? 'Walk-in Driver' : 'Unknown driver')}
                />
                <DetailBlock label="Source" value={reservation.source === 'walk_in' ? 'Walk-In' : 'Reservation'} />
                <DetailBlock label="Vehicle" value={reservation.vehicleNumber || 'No plate captured'} />
                <DetailBlock label="Slot" value={reservation.slotNumber} />
                <DetailBlock label="Reservation Amount" value={formatCurrency(reservation.amount)} />
                <DetailBlock label="Reserved At" value={formatDateTime(reservation.checkInTime)} />
                <DetailBlock label="Expires At" value={formatDateTime(reservation.checkOutTime)} />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Parking Actions</div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <ReservationParkingActions reservation={reservation} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Linked Session</div>
                {linkedSession ? (
                  <div className="rounded-lg border border-border bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs text-foreground">{linkedSession.sessionId}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Started {formatDateTime(linkedSession.startedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${sessionTone(linkedSession.status)} border text-xs font-medium`}>
                          {linkedSession.status}
                        </Badge>
                        {onOpenSession ? (
                          <Button size="sm" variant="outline" className="border-border" onClick={() => onOpenSession(linkedSession)}>
                            Open Session
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                    No linked session for this reservation yet.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Payment History</div>
                <PaymentHistory payments={linkedPayments} />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Audit History</div>
                <AuditTimeline logs={linkedAuditLogs} />
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function SessionDetailSheet({
  open,
  onOpenChange,
  session,
  reservation,
  payments,
  auditLogs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ParkingSessionRecord | null;
  reservation: Reservation | null;
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
}) {
  const linkedPayments = session
    ? payments.filter(
        (payment) =>
          payment.sessionId === session.id ||
          (session.reservationId ? payment.reservationId === session.reservationId : false),
      )
    : [];
  const linkedAuditLogs = session
    ? auditLogs.filter(
        (log) =>
          log.sessionId === session.id ||
          (session.reservationId ? log.reservationId === session.reservationId : false) ||
          log.slotId === session.slotId,
      )
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border sm:max-w-2xl">
        {session ? (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle>{session.sessionId}</SheetTitle>
              <SheetDescription>
                Session timeline with linked reservation, payments, and audit trail.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${sessionTone(session.status)} border text-xs font-medium`}>
                  {session.status}
                </Badge>
                <Badge className={`${paymentTone(session.paymentStatus)} border text-xs font-medium`}>
                  Payment {session.paymentStatus}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailBlock label="Slot" value={session.slotNumber} />
                <DetailBlock label="Duration" value={`${session.billedMinutes} min`} />
                <DetailBlock label="Started At" value={formatDateTime(session.startedAt)} />
                <DetailBlock label="Ended At" value={formatDateTime(session.endedAt)} />
                <DetailBlock label="Billed Amount" value={formatCurrency(session.amount)} />
                <DetailBlock label="Linked Reservation" value={reservation?.reservationId ?? 'No linked reservation'} />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Parking Actions</div>
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <SessionParkingActions session={session} reservation={reservation} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Payment History</div>
                <PaymentHistory payments={linkedPayments} />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">Audit History</div>
                <AuditTimeline logs={linkedAuditLogs} />
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
