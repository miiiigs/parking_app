"use client";

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, RefreshCcw, RotateCcw, ShieldCheck } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { recordOperatorActionFailure, recordOperatorActionSuccess } from '@/lib/operatorDataStore';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { DEFAULT_PARKING_PRICING, formatParkingPricingSummary, type ParkingPricingConfig, type ParkingPricingMode } from '@/lib/parkingPricing';
import type { ReconciliationRun } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

type AdminAction = 'reconcile' | 'reset-slots' | 'update-pricing';
type AdminActionPreview = {
  action: AdminAction;
  title: string;
  summary: string;
  counts: Record<string, number>;
};

const PRICING_MODE_OPTIONS: Array<{ value: ParkingPricingMode; label: string }> = [
  { value: 'flat_rate', label: 'Flat rate' },
  { value: 'fixed_rate', label: 'Fixed hourly rate' },
  { value: 'tiered', label: 'First period + succeeding rate' },
];

function toCurrencyInput(value: number) {
  return Number.isFinite(value) ? value.toString() : '0';
}

function toIntegerInput(value: number) {
  return Number.isFinite(value) ? Math.round(value).toString() : '0';
}

function buildPricingDraft(config?: ParkingPricingConfig | null) {
  const source = config ?? DEFAULT_PARKING_PRICING;

  return {
    mode: source.mode,
    flatRateAmount: toCurrencyInput(source.flatRateAmount),
    fixedHourlyRate: toCurrencyInput(source.fixedHourlyRate),
    firstPeriodHours: toIntegerInput(source.firstPeriodHours),
    firstPeriodRate: toCurrencyInput(source.firstPeriodRate),
    succeedingHourlyRate: toCurrencyInput(source.succeedingHourlyRate),
    entryGraceMinutes: toIntegerInput(source.entryGraceMinutes),
    exitGraceMinutes: toIntegerInput(source.exitGraceMinutes),
  };
}

export default function AdminToolsPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useOperatorData();
  const [runningAction, setRunningAction] = useState<AdminAction | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<AdminAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [pendingPreview, setPendingPreview] = useState<AdminActionPreview | null>(null);
  const [pricingDraft, setPricingDraft] = useState(() => buildPricingDraft(null));

  const reconciliationRuns = data?.reconciliationRuns ?? [];
  const metrics = data?.metrics ?? null;
  const canRunReconciliation = hasOperatorCapability(user?.role, 'run-reconciliation');
  const canResetSlots = hasOperatorCapability(user?.role, 'reset-slot-statuses');
  const canManagePricing = hasOperatorCapability(user?.role, 'manage-pricing');

  const latestRun = reconciliationRuns[0] ?? null;

  useEffect(() => {
    if (!data?.locationPricing) {
      return;
    }

    setPricingDraft(buildPricingDraft(data.locationPricing));
  }, [data?.locationPricing]);

  const parsedPricingConfig = useMemo<ParkingPricingConfig>(() => ({
    mode: pricingDraft.mode,
    flatRateAmount: Number(pricingDraft.flatRateAmount) || 0,
    fixedHourlyRate: Number(pricingDraft.fixedHourlyRate) || 0,
    firstPeriodHours: Math.max(1, Number(pricingDraft.firstPeriodHours) || DEFAULT_PARKING_PRICING.firstPeriodHours),
    firstPeriodRate: Number(pricingDraft.firstPeriodRate) || 0,
    succeedingHourlyRate: Number(pricingDraft.succeedingHourlyRate) || 0,
    entryGraceMinutes: Math.max(0, Number(pricingDraft.entryGraceMinutes) || 0),
    exitGraceMinutes: Math.max(0, Number(pricingDraft.exitGraceMinutes) || 0),
  }), [pricingDraft]);

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
      const payload = action === 'update-pricing'
        ? { action, preview: true, pricingConfig: parsedPricingConfig }
        : { action, preview: true };
      const response = await fetch('/api/operator/admin-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload?.error || 'Failed to load action preview.');
      }

      setPendingPreview(responsePayload.preview as AdminActionPreview);
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
      const requestPayload = action === 'update-pricing'
        ? { action, pricingConfig: parsedPricingConfig }
        : { action };
      const response = await fetch('/api/operator/admin-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responsePayload?.error || 'Admin tool action failed.');
      }

      setMessage(responsePayload?.message ?? 'Action completed.');
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

  function updatePricingField<K extends keyof typeof pricingDraft>(key: K, value: (typeof pricingDraft)[K]) {
    setPricingDraft((current) => ({
      ...current,
      [key]: value,
    }));
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

        <Card className="border-border bg-card">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-foreground">Parking Pricing</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure the rate model and grace periods for the active parking location.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                {formatParkingPricingSummary(parsedPricingConfig)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!canManagePricing ? (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                Read-only access. Your role can view pricing, but cannot change it.
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="pricing-mode">Pricing mode</Label>
                <Select
                  value={pricingDraft.mode}
                  onValueChange={(value) => updatePricingField('mode', value as ParkingPricingMode)}
                  disabled={!canManagePricing}
                >
                  <SelectTrigger id="pricing-mode" className="border-border bg-input">
                    <SelectValue placeholder="Select a pricing mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-grace">Entry grace (min)</Label>
                <Input
                  id="entry-grace"
                  type="number"
                  min={0}
                  max={120}
                  value={pricingDraft.entryGraceMinutes}
                  onChange={(event) => updatePricingField('entryGraceMinutes', event.target.value)}
                  className="border-border bg-input"
                  disabled={!canManagePricing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exit-grace">Exit grace (min)</Label>
                <Input
                  id="exit-grace"
                  type="number"
                  min={0}
                  max={120}
                  value={pricingDraft.exitGraceMinutes}
                  onChange={(event) => updatePricingField('exitGraceMinutes', event.target.value)}
                  className="border-border bg-input"
                  disabled={!canManagePricing}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pricingDraft.mode === 'flat_rate' ? (
                <div className="space-y-2">
                  <Label htmlFor="flat-rate">Flat rate amount</Label>
                  <Input
                    id="flat-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={pricingDraft.flatRateAmount}
                    onChange={(event) => updatePricingField('flatRateAmount', event.target.value)}
                    className="border-border bg-input"
                    disabled={!canManagePricing}
                  />
                </div>
              ) : null}

              {pricingDraft.mode === 'fixed_rate' ? (
                <div className="space-y-2">
                  <Label htmlFor="fixed-rate">Fixed hourly rate</Label>
                  <Input
                    id="fixed-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={pricingDraft.fixedHourlyRate}
                    onChange={(event) => updatePricingField('fixedHourlyRate', event.target.value)}
                    className="border-border bg-input"
                    disabled={!canManagePricing}
                  />
                </div>
              ) : null}

              {pricingDraft.mode === 'tiered' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="first-period-hours">First period hours</Label>
                    <Input
                      id="first-period-hours"
                      type="number"
                      min={1}
                      step="1"
                      value={pricingDraft.firstPeriodHours}
                      onChange={(event) => updatePricingField('firstPeriodHours', event.target.value)}
                      className="border-border bg-input"
                      disabled={!canManagePricing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="first-period-rate">First period rate</Label>
                    <Input
                      id="first-period-rate"
                      type="number"
                      min={0}
                      step="0.01"
                      value={pricingDraft.firstPeriodRate}
                      onChange={(event) => updatePricingField('firstPeriodRate', event.target.value)}
                      className="border-border bg-input"
                      disabled={!canManagePricing}
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              {pricingDraft.mode === 'tiered' ? (
                <div className="space-y-2 xl:max-w-sm">
                  <Label htmlFor="succeeding-rate">Succeeding hourly rate</Label>
                  <Input
                    id="succeeding-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={pricingDraft.succeedingHourlyRate}
                    onChange={(event) => updatePricingField('succeedingHourlyRate', event.target.value)}
                    className="border-border bg-input"
                    disabled={!canManagePricing}
                  />
                </div>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[150px]"
                  disabled={!canManagePricing || loadingPreview === 'update-pricing' || runningAction === 'update-pricing'}
                  onClick={() => setPricingDraft(buildPricingDraft(data?.locationPricing ?? DEFAULT_PARKING_PRICING))}
                >
                  Reset form
                </Button>
                <Button
                  type="button"
                  className="min-w-[180px]"
                  disabled={!canManagePricing || loadingPreview === 'update-pricing' || runningAction === 'update-pricing'}
                  onClick={() => void fetchActionPreview('update-pricing')}
                >
                  {loadingPreview === 'update-pricing' || runningAction === 'update-pricing' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save pricing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
