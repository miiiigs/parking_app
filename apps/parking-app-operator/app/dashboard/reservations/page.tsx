"use client";

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { ReservationDetailSheet, SessionDetailSheet } from '@/components/dashboard/operation-detail-sheet';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatCurrency';
import type { Reservation } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

export default function ReservationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data, loading } = useOperatorData();
  const reservations = data?.reservations ?? [];
  const sessions = data?.sessions ?? [];
  const payments = data?.payments ?? [];
  const auditLogs = data?.auditLogs ?? [];

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      String(reservation.reservationId ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(reservation.vehicleNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(reservation.driverName ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || reservation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [reservations, selectedReservationId],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const formatTime = (value: string | Date | null | undefined) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

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
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Live Reservations</h1>
          <p className="mt-2 text-muted-foreground">Manage and monitor all parking reservations in real-time</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by reservation ID, vehicle, or driver..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="border-border bg-input pl-10 text-foreground"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'All', value: null },
                  { label: 'Active', value: 'active' },
                  { label: 'Completed', value: 'completed' },
                ].map((option) => (
                  <Button
                    key={option.label}
                    onClick={() => setStatusFilter(option.value)}
                    variant={statusFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    className={statusFilter === option.value ? 'bg-primary text-primary-foreground' : 'border-border'}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !data ? <div className="py-8 text-center text-muted-foreground">Loading reservations...</div> : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Res. ID', 'Driver', 'Vehicle', 'Slot', 'Check-in', 'Check-out', 'Duration', 'Status', 'Payment', 'Amount', 'Actions'].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation: Reservation) => (
                    <tr key={reservation.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{reservation.reservationId}</td>
                      <td className="px-4 py-3 text-foreground">{reservation.driverName || 'Walk-in Driver'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{reservation.vehicleNumber}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{reservation.slotNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(reservation.checkInTime)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(reservation.checkOutTime)}</td>
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border text-xs"
                          onClick={() => setSelectedReservationId(reservation.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredReservations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No reservations found matching your criteria</div>
            ) : null}
          </CardContent>
        </Card>

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
              ? reservations.find((reservation) => reservation.id === selectedSession.reservationId) ?? null
              : null
          }
          payments={payments}
          auditLogs={auditLogs}
        />
      </div>
    </DashboardLayout>
  );
}
