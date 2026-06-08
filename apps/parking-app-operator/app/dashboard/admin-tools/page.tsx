"use client";

import { useMemo, useState } from 'react';
import { Loader2, RefreshCcw, RotateCcw, ShieldCheck } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { recordOperatorActionFailure, recordOperatorActionSuccess } from '@/lib/operatorDataStore';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import type { ReconciliationRun } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

type AdminAction = 'reconcile' | 'reset-slots';
type AdminActionPreview = {
  action: AdminAction;
  title: string;
  summary: string;
  counts: Record<string, number>;
};

export default function AdminToolsPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useOperatorData();
  const [runningAction, setRunningAction] = useState<AdminAction | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<AdminAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [pendingPreview, setPendingPreview] = useState<AdminActionPreview | null>(null);

  const reconciliationRuns = data?.reconciliationRuns ?? [];
  const metrics = data?.metrics ?? null;
  const canRunReconciliation = hasOperatorCapability(user?.role, 'run-reconciliation');
  const canResetSlots = hasOperatorCapability(user?.role, 'reset-slot-statuses');

  const latestRun = reconciliationRuns[0] ?? null;

  const toolCards = useMemo(
    () => [
      {
        id: 'reconcile' as const,
        title: 'Run Reconciliation',
        description: 'Check the slot board against reservations and sessions, then fix mismatched states.',
        icon: RefreshCcw,
        disabled: !canRunReconciliation,
        buttonLabel: 'Run Checkup',
        tone: 'default' as const,
      },
      {
        id: 'reset-slots' as const,
        title: 'Reset Slot Statuses',
        description: 'Force every slot back to available and record the reset in the operator event log.',
        icon: RotateCcw,
        disabled: !canResetSlots,
        buttonLabel: 'Reset Slots',
        tone: 'outline' as const,
      },
    ],
    [canRunReconciliation, canResetSlots],
  );

  async function fetchActionPreview(action: AdminAction) {
    setLoadingPreview(action);
    setMessage(null);

    try {
      const response = await fetch('/api/operator/admin-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, preview: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load action preview.');
      }

      setPendingPreview(payload.preview as AdminActionPreview);
      recordOperatorActionSuccess();
    } catch (error) {
      recordOperatorActionFailure();
      setMessage(error instanceof Error ? error.message : 'Failed to load action preview.');
      setMessageTone('error');
    } finally {
      setLoadingPreview(null);
    }
  }

  async function runAdminAction(action: AdminAction) {
    setRunningAction(action);
    setMessage(null);

    try {
      const response = await fetch('/api/operator/admin-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Admin tool action failed.');
      }

      setMessage(payload?.message ?? 'Action completed.');
      setMessageTone('success');
      setPendingPreview(null);
      recordOperatorActionSuccess();
      await refresh({ silent: true });
    } catch (error) {
      recordOperatorActionFailure();
      setMessage(error instanceof Error ? error.message : 'Admin tool action failed.');
      setMessageTone('error');
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Admin Tools</h1>
          <p className="text-muted-foreground">
            Operational controls ported from the hardened admin workflow.
          </p>
        </div>

        <AlertDialog open={Boolean(pendingPreview)} onOpenChange={(open) => (!open ? setPendingPreview(null) : null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingPreview?.title ?? 'Confirm action'}</AlertDialogTitle>
              <AlertDialogDescription>{pendingPreview?.summary ?? ''}</AlertDialogDescription>
            </AlertDialogHeader>
            {pendingPreview ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(pendingPreview.counts).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  if (!pendingPreview) {
                    return;
                  }
                  void runAdminAction(pendingPreview.action);
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              messageTone === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Mismatches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{metrics?.dataMismatches ?? 0}</div>
              <p className="mt-2 text-xs text-muted-foreground">Current slot states that disagree with reservation/session truth.</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent Reconciliations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{reconciliationRuns.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">Stored reconciliation runs available in the hardened backend.</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm font-medium capitalize text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {user?.role ?? 'Unknown'}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tools are filtered and enforced by role capabilities.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            {toolCards.map((tool) => {
              const Icon = tool.icon;
              const isRunning = runningAction === tool.id;

              return (
                <Card key={tool.id} className="border-border bg-card">
                  <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-secondary p-2 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-lg font-semibold text-foreground">{tool.title}</div>
                      </div>
                      <p className="max-w-2xl text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                    <Button
                      variant={tool.tone}
                      disabled={tool.disabled || isRunning || loadingPreview === tool.id}
                      onClick={() => void fetchActionPreview(tool.id)}
                      className="min-w-[160px]"
                    >
                      {isRunning || loadingPreview === tool.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {tool.buttonLabel}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Recent Reconciliation Runs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canRunReconciliation && !canResetSlots ? (
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                  Read-only access. Your role can view audit and metrics, but cannot run operator actions.
                </div>
              ) : null}
              {loading && !data ? (
                <div className="py-4 text-sm text-muted-foreground">Loading reconciliation history...</div>
              ) : null}

              {latestRun ? (
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">{latestRun.runStatus}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(latestRun.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Mismatches</div>
                      <div className="font-semibold text-foreground">{latestRun.mismatchCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fixed</div>
                      <div className="font-semibold text-foreground">{latestRun.fixedCount}</div>
                    </div>
                  </div>
                  {latestRun.message ? (
                    <p className="mt-3 text-sm text-muted-foreground">{latestRun.message}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No reconciliation runs recorded yet.
                </div>
              )}

              <div className="space-y-3">
                {reconciliationRuns.slice(0, 5).map((run: ReconciliationRun) => (
                  <div key={run.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium capitalize text-foreground">{run.runStatus}</div>
                      <div className="text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Fixed {run.fixedCount} of {run.mismatchCount} mismatches
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
