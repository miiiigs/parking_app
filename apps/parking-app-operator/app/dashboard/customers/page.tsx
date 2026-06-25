'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck, UsersRound } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import type { CustomerOversightItem, CustomerOversightResponse } from '@/lib/types';

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'No recent activity';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No recent activity';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentTone(status: CustomerOversightItem['latestPaymentStatus']) {
  switch (status) {
    case 'completed':
      return 'bg-green-400/10 text-green-400 border-green-400/20';
    case 'failed':
      return 'bg-red-400/10 text-red-400 border-red-400/20';
    case 'refunded':
      return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
    case 'pending':
      return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
    default:
      return 'bg-secondary/60 text-muted-foreground border-border';
  }
}

function overlapTone(hasDashboardAccess: boolean) {
  return hasDashboardAccess
    ? 'bg-primary/10 text-primary border-primary/20'
    : 'bg-secondary/60 text-muted-foreground border-border';
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return 'No payment yet';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function CustomerOversightPage() {
  const { user } = useAuth();
  const [draftSearch, setDraftSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [overlapFilter, setOverlapFilter] = useState<'all' | 'dashboard' | 'customer-only'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [payload, setPayload] = useState<CustomerOversightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(draftSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [draftSearch]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, overlapFilter, pageSize]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setPayload(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      overlap: overlapFilter,
    });

    if (searchTerm) {
      params.set('search', searchTerm);
    }

    fetch(`/api/operator/customers?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const nextPayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(nextPayload?.error || 'Failed to load customer oversight.');
        }

        setPayload(nextPayload as CustomerOversightResponse);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'Failed to load customer oversight.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [isAdmin, overlapFilter, page, pageSize, searchTerm]);

  const pagination = payload?.pagination ?? { page: 1, pageSize, totalItems: 0, totalPages: 1 };
  const items = payload?.items ?? [];
  const summary = payload?.summary ?? {
    totalCustomers: 0,
    activeCustomers: 0,
    dashboardOverlapCount: 0,
    missingContactCount: 0,
  };

  const overlapOptions = useMemo(
    () => [
      { label: 'All Customers', value: 'all' as const },
      { label: 'Dashboard Overlap', value: 'dashboard' as const },
      { label: 'Customer Only', value: 'customer-only' as const },
    ],
    [],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Admin control plane
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Customer Oversight</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Review customer contact, recent lot activity, payment state, and dashboard-account overlap without leaving the operator dashboard.
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <Card className="border-border bg-card">
            <CardContent className="flex items-start gap-3 p-6">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-semibold text-foreground">Admin access required</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Customer oversight is limited to admins so non-admin roles do not gain global customer visibility.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isAdmin ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Known Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-foreground">{summary.totalCustomers}</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Active Right Now</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-foreground">{summary.activeCustomers}</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Dashboard Overlap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-foreground">{summary.dashboardOverlapCount}</div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Missing Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-foreground">{summary.missingContactCount}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search customer, contact, plate, lot, or role overlap..."
                        value={draftSearch}
                        onChange={(event) => setDraftSearch(event.target.value)}
                        className="border-border bg-input pl-10 text-foreground"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {overlapOptions.map((option) => (
                        <Button
                          key={option.value}
                          onClick={() => setOverlapFilter(option.value)}
                          variant={overlapFilter === option.value ? 'default' : 'outline'}
                          size="sm"
                          className={overlapFilter === option.value ? 'bg-primary text-primary-foreground' : 'border-border'}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground xl:self-center">
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
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <div>
                      {pagination.totalItems} result{pagination.totalItems === 1 ? '' : 's'} across {pagination.totalPages} page
                      {pagination.totalPages === 1 ? '' : 's'}
                    </div>
                    <div className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs uppercase tracking-[0.12em]">
                      Read-only customer support snapshot
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading customer oversight...
                  </div>
                ) : null}

                {loadError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {loadError}
                  </div>
                ) : null}

                {!loading && !loadError ? (
                  <>
                    <div className="grid gap-3 xl:hidden">
                      {items.map((item) => (
                        <Card key={item.userId} className="border-border bg-secondary/20">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {item.displayName ?? item.email ?? item.phone ?? 'Unknown customer'}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.email ?? item.phone ?? 'No contact info available'}</div>
                                <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground/80">{item.userId}</div>
                              </div>
                              <Badge className={`${overlapTone(item.hasDashboardAccess)} border text-xs font-medium`}>
                                {item.hasDashboardAccess ? `${item.dashboardRole ?? 'dashboard'} overlap` : 'customer only'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                              <div>
                                <div className="text-xs text-muted-foreground">Latest lot</div>
                                <div className="font-medium text-foreground">{item.latestLocationName ?? 'No lot history'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Recent plates</div>
                                <div className="font-medium text-foreground">{item.recentVehiclePlates.join(', ') || 'None captured'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Reservations</div>
                                <div className="font-medium text-foreground">
                                  {item.totalReservations} total, {item.activeReservations} active
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Latest payment</div>
                                <div className="font-medium text-foreground">{formatCurrency(item.latestPaymentAmount)}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Badge className={`${paymentTone(item.latestPaymentStatus)} border text-xs font-medium`}>
                                {item.latestPaymentStatus ?? 'no payment'}
                              </Badge>
                              <div className="text-xs text-muted-foreground">{formatTimestamp(item.latestActivityAt)}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto xl:block">
                      <table className="w-full min-w-[1160px] text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Latest Lot</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recent Plates</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reservations</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sessions</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Latest Payment</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Latest Activity</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Overlap</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.userId} className="border-b border-border align-top transition-colors hover:bg-secondary/40">
                              <td className="px-4 py-4">
                                <div className="font-medium text-foreground">
                                  {item.displayName ?? item.email ?? item.phone ?? 'Unknown customer'}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.email ?? item.phone ?? 'No contact info available'}</div>
                                <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground/80">{item.userId}</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="font-medium text-foreground">{item.latestLocationName ?? 'No lot history'}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {item.visitedLocationNames.slice(1).join(', ') || 'Single-lot history so far'}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-foreground">
                                {item.recentVehiclePlates.length > 0 ? item.recentVehiclePlates.join(', ') : 'None captured'}
                              </td>
                              <td className="px-4 py-4 text-foreground">
                                <div>{item.totalReservations} total</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {item.activeReservations} active, {item.completedReservations} completed, {item.noShowReservations} no-show
                                </div>
                              </td>
                              <td className="px-4 py-4 text-foreground">
                                <div>{item.activeSessions} active</div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.completedSessions} completed</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="font-medium text-foreground">{formatCurrency(item.latestPaymentAmount)}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{formatTimestamp(item.latestPaidAt)}</div>
                                <Badge className={`mt-2 ${paymentTone(item.latestPaymentStatus)} border text-xs font-medium`}>
                                  {item.latestPaymentStatus ?? 'no payment'}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-foreground">{formatTimestamp(item.latestActivityAt)}</td>
                              <td className="px-4 py-4">
                                <Badge className={`${overlapTone(item.hasDashboardAccess)} border text-xs font-medium`}>
                                  {item.hasDashboardAccess ? `${item.dashboardRole ?? 'dashboard'} overlap` : 'customer only'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No customer records matched the current search and overlap filters.
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        className="border-border"
                      >
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                        className="border-border"
                      >
                        Next
                      </Button>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersRound className="h-5 w-5 text-primary" />
                  Current Data Boundaries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {(payload?.limitations ?? []).map((limitation) => (
                  <div key={limitation} className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
                    {limitation}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
