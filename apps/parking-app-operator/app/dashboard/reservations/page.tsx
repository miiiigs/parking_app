"use client";

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { ReservationDetailSheet, SessionDetailSheet } from '@/components/dashboard/operation-detail-sheet';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatCurrency';
import type { Reservation, ReservationListResponse } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

function formatTime(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function getStatusColor(status: string) {
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
}

function getPaymentColor(status: string) {
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
}

export default function ReservationsPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Reservation['status'] | null>(null);
  const [sourceFilter, setSourceFilter] = useState<Reservation['source'] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [list, setList] = useState<ReservationListResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data, loading: dashboardLoading } = useOperatorData();
  const reservations = list?.items ?? [];
  const sessions = data?.sessions ?? [];
  const payments = data?.payments ?? [];
  const auditLogs = data?.auditLogs ?? [];

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(draftSearch), 250);
    return () => window.clearTimeout(timer);
  }, [draftSearch]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sourceFilter, statusFilter, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingList(true);
    setLoadError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }

    if (statusFilter) {
      params.set('status', statusFilter);
    }

    if (sourceFilter) {
      params.set('source', sourceFilter);
    }

    fetch(`/api/operator/reservations?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load reservations.');
        }
        setList(payload as ReservationListResponse);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Failed to load reservations.');
      })
      .finally(() => setLoadingList(false));

    return () => controller.abort();
  }, [page, pageSize, searchTerm, sourceFilter, statusFilter]);

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === selectedReservationId) ?? null,
    [reservations, selectedReservationId],
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const pagination = list?.pagination ?? { page: 1, pageSize, totalItems: 0, totalPages: 1 };

  const statusFilters: Array<{ label: string; value: Reservation['status'] | null }> = [
    { label: 'All', value: null },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'No-show', value: 'no-show' },
  ];

  const statusCounts = list?.statusCounts ?? { active: 0, completed: 0, 'no-show': 0 };
  const sourceFilters: Array<{ label: string; value: Reservation['source'] | null }> = [
    { label: 'All Sources', value: null },
    { label: 'Reserved', value: 'reservation' },
    { label: 'Walk-In', value: 'walk_in' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Live Reservations</h1>
          <p className="mt-2 text-muted-foreground">Server-backed pagination with linked reservation and session detail.</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search reservation, plate, or slot..."
                    value={draftSearch}
                    onChange={(event) => setDraftSearch(event.target.value)}
                    className="border-border bg-input pl-10 text-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map((option) => (
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
                <div className="flex flex-wrap gap-2">
                  {sourceFilters.map((option) => (
                    <Button
                      key={option.label}
                      onClick={() => setSourceFilter(option.value)}
                      variant={sourceFilter === option.value ? 'default' : 'outline'}
                      size="sm"
                      className={sourceFilter === option.value ? 'bg-primary text-primary-foreground' : 'border-border'}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <div>
                  {pagination.totalItems} result{pagination.totalItems === 1 ? '' : 's'} across {pagination.totalPages} page
                  {pagination.totalPages === 1 ? '' : 's'}
                </div>
                <div className="flex items-center gap-2">
                  <span>Page size</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="rounded-md border border-border bg-input px-2 py-1 text-sm text-foreground"
                  >
                    {[10, 20, 40].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingList || (dashboardLoading && !data) ? (
              <div className="py-8 text-center text-muted-foreground">Loading reservations...</div>
            ) : null}

            {loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : null}

            <div className="grid gap-3 xl:hidden">
              {reservations.map((reservation) => (
                <Card key={reservation.id} className="border-border bg-secondary/20">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{reservation.reservationId}</div>
                        <div className="mt-1 text-sm font-medium text-foreground">{reservation.vehicleNumber}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {reservation.source === 'walk_in' ? 'Walk-In' : 'Reservation'}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(reservation.status)} border text-xs font-medium`}>
                        {reservation.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Slot</div>
                        <div className="font-medium text-foreground">{reservation.slotNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Amount</div>
                        <div className="font-medium text-foreground">{formatCurrency(reservation.amount)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Check-in</div>
                        <div className="text-xs text-foreground">{formatTime(reservation.checkInTime)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Payment</div>
                        <Badge className={`${getPaymentColor(reservation.paymentStatus)} border text-xs font-medium`}>
                          {reservation.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-border"
                      onClick={() => setSelectedReservationId(reservation.id)}
                    >
                      View
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Res. ID', 'Source', 'Driver', 'Vehicle', 'Slot', 'Check-in', 'Check-out', 'Duration', 'Status', 'Payment', 'Amount', 'Actions'].map(
                      (label) => (
                        <th key={label} className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{reservation.reservationId}</td>
                      <td className="px-4 py-3 text-foreground">
                        <Badge variant="outline" className="border-border text-xs">
                          {reservation.source === 'walk_in' ? 'Walk-In' : 'Reservation'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {reservation.driverName || (reservation.source === 'walk_in' ? 'Walk-in Driver' : 'Unknown driver')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{reservation.vehicleNumber}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{reservation.slotNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(reservation.checkInTime)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(reservation.checkOutTime)}</td>
                      <td className="px-4 py-3 text-foreground">{reservation.duration} min</td>
                      <td className="px-4 py-3">
                        <Badge className={`${getStatusColor(reservation.status)} border text-xs font-medium`}>
                          {reservation.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${getPaymentColor(reservation.paymentStatus)} border text-xs font-medium`}>
                          {reservation.paymentStatus}
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

            {reservations.length === 0 && !loadingList ? (
              <div className="py-12 text-center text-muted-foreground">No reservations found matching your criteria.</div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Active: {statusCounts.active} · Completed: {statusCounts.completed} · No-show: {statusCounts['no-show']}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
