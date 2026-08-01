"use client";

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SystemHealth } from '@/components/dashboard/system-health';
import type { AuditListResponse, AuditLog } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

function getStatusColor(status: string) {
  switch (status) {
    case 'success':
      return 'bg-green-400/10 text-green-400 border-green-400/20';
    case 'failure':
      return 'bg-red-400/10 text-red-400 border-red-400/20';
    default:
      return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
  }
}

export default function AuditPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'success' | 'failure' | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [list, setList] = useState<AuditListResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, loading: dashboardLoading } = useOperatorData();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(draftSearch), 250);
    return () => window.clearTimeout(timer);
  }, [draftSearch]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, actionFilter, pageSize]);

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
    if (actionFilter) {
      params.set('action', actionFilter);
    }

    fetch(`/api/operator/audit?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load audit logs.');
        }
        setList(payload as AuditListResponse);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Failed to load audit logs.');
      })
      .finally(() => setLoadingList(false));

    return () => controller.abort();
  }, [actionFilter, page, pageSize, searchTerm, statusFilter]);

  const logs = list?.items ?? [];
  const uniqueActions = list?.uniqueActions ?? [];
  const pagination = list?.pagination ?? { page: 1, pageSize, totalItems: 0, totalPages: 1 };
  const stats = list?.stats ?? { success: 0, failure: 0 };

  const filteredActions = useMemo(() => uniqueActions, [uniqueActions]);

  async function exportAuditCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        export: 'csv',
      });

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      if (actionFilter) {
        params.set('action', actionFilter);
      }

      const response = await fetch(`/api/operator/audit?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to export audit logs.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'operator-audit.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Audit Trail</h1>
          <p className="mt-2 text-muted-foreground">Server-backed logs with export, filters, and mobile-friendly cards.</p>
        </div>

        <SystemHealth compact />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Production Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Successful Operations</span>
                  <span className="text-lg font-bold text-green-400">{stats.success}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${stats.success + stats.failure ? (stats.success / (stats.success + stats.failure)) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Failed Operations</span>
                  <span className="text-lg font-bold text-red-400">{stats.failure}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${stats.success + stats.failure ? (stats.failure / (stats.success + stats.failure)) * 100 : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Health is sourced from live operator sync state and route telemetry.</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search action, operator, slot, or details..."
                    value={draftSearch}
                    onChange={(event) => setDraftSearch(event.target.value)}
                    className="border-border bg-input pl-10 text-foreground"
                  />
                </div>
                <Button size="sm" variant="outline" className="border-border" onClick={() => void exportAuditCsv()} disabled={exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? 'Exporting' : 'Export'}
                </Button>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'All', value: null },
                      { label: 'Success', value: 'success' as const },
                      { label: 'Failure', value: 'failure' as const },
                    ].map((option) => (
                      <Button
                        key={option.label}
                        size="sm"
                        onClick={() => setStatusFilter(option.value)}
                        variant={statusFilter === option.value ? 'default' : 'outline'}
                        className={statusFilter === option.value ? 'bg-primary text-primary-foreground' : 'border-border'}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Action Type</label>
                  <select
                    value={actionFilter || ''}
                    onChange={(event) => setActionFilter(event.target.value || null)}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground xl:min-w-56"
                  >
                    <option value="">All Actions</option>
                    {filteredActions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Page Size</label>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground xl:min-w-28"
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
              <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
            ) : null}

            {loadError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : null}

            <div className="grid gap-3 xl:hidden">
              {logs.map((log: AuditLog) => (
                <Card key={log.id} className="border-border bg-secondary/20">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(log.timestamp, { addSuffix: true })}</div>
                        <div className="mt-1 font-mono text-sm text-foreground">{log.action}</div>
                      </div>
                      <Badge className={`${getStatusColor(log.status)} border text-xs font-medium`}>
                        {log.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Operator</div>
                        <div className="text-foreground">{log.operator}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Slot</div>
                        <div className="text-foreground">{log.slotNumber ?? '-'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">Details</div>
                        <div className="line-clamp-3 text-xs text-muted-foreground">{log.details}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Operator</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Slot</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: AuditLog) => (
                    <tr key={log.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{log.action}</td>
                      <td className="px-4 py-3 text-foreground">{log.operator}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.slotNumber ? <span className="font-medium text-foreground">{log.slotNumber}</span> : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">{log.details}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${getStatusColor(log.status)} border text-xs font-medium`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && !loadingList ? (
              <div className="py-12 text-center text-muted-foreground">No audit logs found matching your criteria.</div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {pagination.totalItems} result{pagination.totalItems === 1 ? '' : 's'} across {pagination.totalPages} page
                {pagination.totalPages === 1 ? '' : 's'}
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
      </div>
    </DashboardLayout>
  );
}
