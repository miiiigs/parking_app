"use client";

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { ReservationDetailSheet, SessionDetailSheet } from '@/components/dashboard/operation-detail-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatCurrency';
import { useOperatorData } from '@/lib/useOperatorData';
import type { Reservation } from '@/lib/types';

export function RecentReservations() {
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { data, loading } = useOperatorData();
  const activeReservations = (data?.reservations ?? []).filter((reservation) => reservation.status === 'active');
  const sessions = data?.sessions ?? [];
  const payments = data?.payments ?? [];
  const auditLogs = data?.auditLogs ?? [];

  const selectedReservation = useMemo(
    () => activeReservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [activeReservations, selectedReservationId],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'completed':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'no-show':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'pending':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      case 'failed':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Active Reservations ({activeReservations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !data ? <div className="py-8 text-center text-muted-foreground">Loading...</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Res. ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Driver</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Slot</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check-in</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payment</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeReservations.map((reservation: Reservation) => (
                <tr key={reservation.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                  <td className="px-4 py-3 font-mono text-foreground">{reservation.reservationId}</td>
                  <td className="px-4 py-3 text-foreground">{reservation.driverName || 'Walk-in Driver'}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{reservation.vehicleNumber}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{reservation.slotNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(reservation.checkInTime, { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-foreground">{reservation.duration} min</td>
                  <td className="px-4 py-3">
                    <Badge className={`${getStatusColor(reservation.status)} border text-xs font-medium`}>
                      {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${getPaymentColor(reservation.paymentStatus)} border text-xs font-medium`}>
                      {reservation.paymentStatus.charAt(0).toUpperCase() + reservation.paymentStatus.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(reservation.amount)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" className="border-border text-xs" onClick={() => setSelectedReservationId(reservation.id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeReservations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No active reservations</div>
        ) : null}

        <ReservationDetailSheet
          open={Boolean(selectedReservation)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedReservationId(null);
            }
          }}
          reservation={selectedReservation}
          sessions={sessions}
          payments={payments}
          auditLogs={auditLogs}
          onOpenSession={(session) => setSelectedSessionId(session.id)}
        />

        <SessionDetailSheet
          open={Boolean(selectedSession)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSessionId(null);
            }
          }}
          session={selectedSession}
          reservation={
            selectedSession?.reservationId
              ? activeReservations.find((reservation) => reservation.id === selectedSession.reservationId) ??
                data?.reservations.find((reservation) => reservation.id === selectedSession.reservationId) ??
                null
              : null
          }
          payments={payments}
          auditLogs={auditLogs}
        />
      </CardContent>
    </Card>
  );
}
