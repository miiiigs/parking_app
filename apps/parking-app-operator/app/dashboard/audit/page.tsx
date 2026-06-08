"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Download, Search } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AuditLog } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';
import { SystemHealth } from '@/components/dashboard/system-health';

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  const { data, loading } = useOperatorData();
  const logs = data?.auditLogs ?? [];

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      String(log.action ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.operator ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.details ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || log.status === statusFilter;
    const matchesAction = !actionFilter || log.action === actionFilter;

    return matchesSearch && matchesStatus && matchesAction;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'failure':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const stats = {
    success: logs.filter((log) => log.status === 'success').length,
    failure: logs.filter((log) => log.status === 'failure').length,
  };
  const totalOperations = stats.success + stats.failure;
  const successRate = totalOperations === 0 ? 0 : (stats.success / totalOperations) * 100;
  const failureRate = totalOperations === 0 ? 0 : (stats.failure / totalOperations) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Audit Trail</h1>
          <p className="mt-2 text-muted-foreground">
            Complete event log of all operator actions and system events
          </p>
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
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${successRate}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Failed Operations</span>
                  <span className="text-lg font-bold text-red-400">{stats.failure}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${failureRate}%` }} />
                </div>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">
                  Success Rate: <span className="font-semibold text-green-400">{successRate.toFixed(1)}%</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Health is now sourced from live operator sync state, not hardcoded status text.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by action, operator, or details..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="border-border bg-input pl-10 text-foreground"
                    />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-border">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>

              <div className="flex flex-col gap-4 md:flex-row">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => setStatusFilter(null)}
                      variant={statusFilter === null ? 'default' : 'outline'}
                      className={statusFilter === null ? 'bg-primary text-primary-foreground' : 'border-border'}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setStatusFilter('success')}
                      variant={statusFilter === 'success' ? 'default' : 'outline'}
                      className={statusFilter === 'success' ? 'bg-green-500 text-white' : 'border-border'}
                    >
                      Success
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setStatusFilter('failure')}
                      variant={statusFilter === 'failure' ? 'default' : 'outline'}
                      className={statusFilter === 'failure' ? 'bg-red-500 text-white' : 'border-border'}
                    >
                      Failure
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Action Type</label>
                  <select
                    value={actionFilter || ''}
                    onChange={(event) => setActionFilter(event.target.value || null)}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground md:min-w-56"
                  >
                    <option value="">All Actions</option>
                    {uniqueActions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !data ? <div className="py-8 text-center text-muted-foreground">Loading logs...</div> : null}
            <div className="overflow-x-auto">
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
                  {filteredLogs.map((log: AuditLog) => (
                    <tr key={log.id} className="border-b border-border transition-colors hover:bg-secondary/50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{log.action}</td>
                      <td className="px-4 py-3 text-foreground">{log.operator}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.slotNumber ? (
                          <span className="font-medium text-foreground">{log.slotNumber}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No audit logs found matching your criteria
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
