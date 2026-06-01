'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockAuditLogs } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { Search, Filter, Download } from 'lucide-react';

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(mockAuditLogs.map((log) => log.action)));

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

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
    success: mockAuditLogs.filter((l) => l.status === 'success').length,
    failure: mockAuditLogs.filter((l) => l.status === 'failure').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
          <p className="text-muted-foreground mt-2">
            Complete event log of all operator actions and system events
          </p>
        </div>

        {/* Production Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Production Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Successful Operations</span>
                  <span className="text-lg font-bold text-green-400">{stats.success}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(stats.success / (stats.success + stats.failure)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Failed Operations</span>
                  <span className="text-lg font-bold text-red-400">{stats.failure}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${(stats.failure / (stats.success + stats.failure)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Success Rate:{' '}
                  <span className="text-green-400 font-semibold">
                    {((stats.success / (stats.success + stats.failure)) * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-foreground">System Operational</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-foreground">Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-foreground">Payment Gateway Online</span>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-green-400">All systems operational</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by action, operator, or details..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-input border-border text-foreground"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="flex gap-2">
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
                  <label className="text-xs font-medium text-muted-foreground">
                    Action Type
                  </label>
                  <select
                    value={actionFilter || ''}
                    onChange={(e) => setActionFilter(e.target.value || null)}
                    className="px-3 py-2 bg-input border border-border text-foreground text-sm rounded-md"
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Operator
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Slot
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Details
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </td>
                      <td className="py-3 px-4 text-foreground font-mono text-xs">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-foreground">{log.operator}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {log.slotNumber ? (
                          <span className="font-medium text-foreground">{log.slotNumber}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`${getStatusColor(
                            log.status
                          )} border text-xs font-medium`}
                        >
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No audit logs found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
