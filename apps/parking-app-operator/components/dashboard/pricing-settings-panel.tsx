'use client';

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, TimerReset } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { recordOperatorActionFailure, recordOperatorActionSuccess } from '@/lib/operatorDataStore';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import {
  DEFAULT_PARKING_PRICING,
  DEFAULT_RESERVATION_PRICING,
  formatParkingPricingSummary,
  formatReservationPricingSummary,
  type ParkingPricingConfig,
  type ParkingPricingMode,
  type ReservationPricingConfig,
} from '@/lib/parkingPricing';
import { useOperatorData } from '@/lib/useOperatorData';

type PricingPreview = {
  action: 'update-pricing';
  title: string;
  summary: string;
  counts: Record<string, number>;
};

const PRICING_MODE_OPTIONS: Array<{ value: ParkingPricingMode; label: string; description: string }> = [
  { value: 'flat_rate', label: 'Flat rate', description: 'Charge one fixed amount regardless of duration.' },
  { value: 'fixed_rate', label: 'Fixed recurring rate', description: 'Charge a repeated amount on a custom minute interval.' },
  { value: 'tiered', label: 'First period + succeeding rate', description: 'Use one intro period, then charge succeeding custom intervals.' },
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
    fixedRateAmount: toCurrencyInput(source.fixedRateAmount),
    fixedRateIntervalMinutes: toIntegerInput(source.fixedRateIntervalMinutes),
    firstPeriodMinutes: toIntegerInput(source.firstPeriodMinutes),
    firstPeriodRate: toCurrencyInput(source.firstPeriodRate),
    succeedingRateAmount: toCurrencyInput(source.succeedingRateAmount),
    succeedingRateIntervalMinutes: toIntegerInput(source.succeedingRateIntervalMinutes),
    entryGraceMinutes: toIntegerInput(source.entryGraceMinutes),
    exitGraceMinutes: toIntegerInput(source.exitGraceMinutes),
  };
}

function buildReservationPricingDraft(config?: ReservationPricingConfig | null) {
  const source = config ?? DEFAULT_RESERVATION_PRICING;

  return {
    fee30Minutes: toCurrencyInput(source.fee30Minutes),
    fee60Minutes: toCurrencyInput(source.fee60Minutes),
    fee120Minutes: toCurrencyInput(source.fee120Minutes),
  };
}

export function PricingSettingsPanel() {
  const { user, activeLocation } = useAuth();
  const { data, refresh } = useOperatorData();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [pendingPreview, setPendingPreview] = useState<PricingPreview | null>(null);
  const [pricingDraft, setPricingDraft] = useState(() => buildPricingDraft(null));
  const [reservationPricingDraft, setReservationPricingDraft] = useState(() => buildReservationPricingDraft(null));

  const canManagePricing = hasOperatorCapability(user?.role, 'manage-pricing');

  useEffect(() => {
    if (!data?.locationPricing) {
      return;
    }

    setPricingDraft(buildPricingDraft(data.locationPricing));
    setReservationPricingDraft(buildReservationPricingDraft(data.locationReservationPricing));
  }, [data?.locationPricing, data?.locationReservationPricing]);

  const parsedPricingConfig = useMemo<ParkingPricingConfig>(() => ({
    mode: pricingDraft.mode,
    flatRateAmount: Number(pricingDraft.flatRateAmount) || 0,
    fixedRateAmount: Number(pricingDraft.fixedRateAmount) || 0,
    fixedRateIntervalMinutes: Math.max(1, Number(pricingDraft.fixedRateIntervalMinutes) || DEFAULT_PARKING_PRICING.fixedRateIntervalMinutes),
    firstPeriodMinutes: Math.max(1, Number(pricingDraft.firstPeriodMinutes) || DEFAULT_PARKING_PRICING.firstPeriodMinutes),
    firstPeriodRate: Number(pricingDraft.firstPeriodRate) || 0,
    succeedingRateAmount: Number(pricingDraft.succeedingRateAmount) || 0,
    succeedingRateIntervalMinutes: Math.max(1, Number(pricingDraft.succeedingRateIntervalMinutes) || DEFAULT_PARKING_PRICING.succeedingRateIntervalMinutes),
    entryGraceMinutes: Math.max(0, Number(pricingDraft.entryGraceMinutes) || 0),
    exitGraceMinutes: Math.max(0, Number(pricingDraft.exitGraceMinutes) || 0),
  }), [pricingDraft]);

  const parsedReservationPricingConfig = useMemo<ReservationPricingConfig>(() => ({
    fee30Minutes: Number(reservationPricingDraft.fee30Minutes) || 0,
    fee60Minutes: Number(reservationPricingDraft.fee60Minutes) || 0,
    fee120Minutes: Number(reservationPricingDraft.fee120Minutes) || 0,
  }), [reservationPricingDraft]);

  const activeMode = PRICING_MODE_OPTIONS.find((option) => option.value === pricingDraft.mode) ?? PRICING_MODE_OPTIONS[0];

  async function fetchPricingPreview() {
    setLoadingPreview(true);
    setMessage(null);

    try {
      const response = await fetch('/api/operator/admin-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-pricing',
          preview: true,
          pricingConfig: parsedPricingConfig,
          reservationPricingConfig: parsedReservationPricingConfig,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to preview pricing changes.');
      }

      setPendingPreview(payload.preview as PricingPreview);
      recordOperatorActionSuccess();
    } catch (error) {
      recordOperatorActionFailure();
      setMessage(error instanceof Error ? error.message : 'Failed to preview pricing changes.');
      setMessageTone('error');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function savePricing() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/operator/admin-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-pricing',
          pricingConfig: parsedPricingConfig,
          reservationPricingConfig: parsedReservationPricingConfig,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save pricing.');
      }

      setPendingPreview(null);
      setMessage(payload?.message ?? 'Pricing updated.');
      setMessageTone('success');
      recordOperatorActionSuccess();
      await refresh({ silent: true });
    } catch (error) {
      recordOperatorActionFailure();
      setMessage(error instanceof Error ? error.message : 'Failed to save pricing.');
      setMessageTone('error');
    } finally {
      setSaving(false);
    }
  }

  function updatePricingField<K extends keyof typeof pricingDraft>(key: K, value: (typeof pricingDraft)[K]) {
    setPricingDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateReservationPricingField<K extends keyof typeof reservationPricingDraft>(
    key: K,
    value: (typeof reservationPricingDraft)[K],
  ) {
    setReservationPricingDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={Boolean(pendingPreview)} onOpenChange={(open) => (!open ? setPendingPreview(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingPreview?.title ?? 'Confirm pricing update'}</AlertDialogTitle>
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
                void savePricing();
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

      <Card className="border-border bg-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg font-semibold text-foreground">Pricing, Rates, and Grace Periods</CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Set the billing model for the active parking location without mixing it into reconciliation and reset actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{activeLocation?.name ?? 'No active location'}</Badge>
              <Badge variant="outline">{formatParkingPricingSummary(parsedPricingConfig)}</Badge>
              <Badge variant="outline">{formatReservationPricingSummary(parsedReservationPricingConfig)}</Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Current Mode</div>
              <div className="mt-2 font-semibold text-foreground">{activeMode.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{activeMode.description}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Entry Grace</div>
              <div className="mt-2 font-semibold text-foreground">{parsedPricingConfig.entryGraceMinutes} min</div>
              <p className="mt-1 text-sm text-muted-foreground">Time allowed before billing begins.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Exit Grace</div>
              <div className="mt-2 font-semibold text-foreground">{parsedPricingConfig.exitGraceMinutes} min</div>
              <p className="mt-1 text-sm text-muted-foreground">Time allowed after checkout before penalties apply.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4 md:col-span-3">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Reservation Fees</div>
              <div className="mt-2 font-semibold text-foreground">{formatReservationPricingSummary(parsedReservationPricingConfig)}</div>
              <p className="mt-1 text-sm text-muted-foreground">Used for reservation holds on the mobile app before entry.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!canManagePricing ? (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              Read-only access. Your role can view parking setup, but cannot change it.
            </div>
          ) : null}

          <Tabs defaultValue="rate-model" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 md:grid-cols-3">
              <TabsTrigger value="rate-model" className="h-11 border border-border bg-secondary/30 data-[state=active]:border-primary">
                Rate Model
              </TabsTrigger>
              <TabsTrigger value="rates" className="h-11 border border-border bg-secondary/30 data-[state=active]:border-primary">
                Rate Rules
              </TabsTrigger>
              <TabsTrigger value="grace-periods" className="h-11 border border-border bg-secondary/30 data-[state=active]:border-primary">
                Grace Periods
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rate-model">
              <Card className="border-border bg-secondary/10">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Choose the pricing behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
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
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CreditCard className="h-4 w-4 text-primary" />
                      {activeMode.label}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{activeMode.description}</p>
                    <p className="mt-3 text-sm font-medium text-foreground">{formatParkingPricingSummary(parsedPricingConfig)}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rates">
              <Card className="border-border bg-secondary/10">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Configure charge amounts and intervals</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fixed-rate">Fixed rate amount</Label>
                        <Input
                          id="fixed-rate"
                          type="number"
                          min={0}
                          step="0.01"
                          value={pricingDraft.fixedRateAmount}
                          onChange={(event) => updatePricingField('fixedRateAmount', event.target.value)}
                          className="border-border bg-input"
                          disabled={!canManagePricing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fixed-rate-interval">Billing interval (min)</Label>
                        <Input
                          id="fixed-rate-interval"
                          type="number"
                          min={1}
                          max={1440}
                          step="1"
                          value={pricingDraft.fixedRateIntervalMinutes}
                          onChange={(event) => updatePricingField('fixedRateIntervalMinutes', event.target.value)}
                          className="border-border bg-input"
                          disabled={!canManagePricing}
                        />
                      </div>
                    </>
                  ) : null}

                  {pricingDraft.mode === 'tiered' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="first-period-minutes">First period duration (min)</Label>
                        <Input
                          id="first-period-minutes"
                          type="number"
                          min={1}
                          max={1440}
                          step="1"
                          value={pricingDraft.firstPeriodMinutes}
                          onChange={(event) => updatePricingField('firstPeriodMinutes', event.target.value)}
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
                      <div className="space-y-2">
                        <Label htmlFor="succeeding-rate">Succeeding rate amount</Label>
                        <Input
                          id="succeeding-rate"
                          type="number"
                          min={0}
                          step="0.01"
                          value={pricingDraft.succeedingRateAmount}
                          onChange={(event) => updatePricingField('succeedingRateAmount', event.target.value)}
                          className="border-border bg-input"
                          disabled={!canManagePricing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="succeeding-rate-interval">Succeeding interval (min)</Label>
                        <Input
                          id="succeeding-rate-interval"
                          type="number"
                          min={1}
                          max={1440}
                          step="1"
                          value={pricingDraft.succeedingRateIntervalMinutes}
                          onChange={(event) => updatePricingField('succeedingRateIntervalMinutes', event.target.value)}
                          className="border-border bg-input"
                          disabled={!canManagePricing}
                        />
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grace-periods">
              <Card className="border-border bg-secondary/10">
                <CardHeader>
                  <CardTitle className="text-base text-foreground">Manage entry and exit protection windows</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
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
                  <div className="rounded-lg border border-border bg-card p-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <TimerReset className="h-4 w-4 text-primary" />
                      Grace period guidance
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Entry grace protects drivers before billing starts. Exit grace is kept with the booking/session details for checkout handling.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="border-border bg-secondary/10">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Reservation fees by arrival window</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="reservation-fee-30">30-minute window fee</Label>
                <Input
                  id="reservation-fee-30"
                  type="number"
                  min={0}
                  step="0.01"
                  value={reservationPricingDraft.fee30Minutes}
                  onChange={(event) => updateReservationPricingField('fee30Minutes', event.target.value)}
                  className="border-border bg-input"
                  disabled={!canManagePricing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation-fee-60">1-hour window fee</Label>
                <Input
                  id="reservation-fee-60"
                  type="number"
                  min={0}
                  step="0.01"
                  value={reservationPricingDraft.fee60Minutes}
                  onChange={(event) => updateReservationPricingField('fee60Minutes', event.target.value)}
                  className="border-border bg-input"
                  disabled={!canManagePricing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation-fee-120">2-hour window fee</Label>
                <Input
                  id="reservation-fee-120"
                  type="number"
                  min={0}
                  step="0.01"
                  value={reservationPricingDraft.fee120Minutes}
                  onChange={(event) => updateReservationPricingField('fee120Minutes', event.target.value)}
                  className="border-border bg-input"
                  disabled={!canManagePricing}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-w-[150px]"
              disabled={!canManagePricing || loadingPreview || saving}
              onClick={() => {
                setPricingDraft(buildPricingDraft(data?.locationPricing ?? DEFAULT_PARKING_PRICING));
                setReservationPricingDraft(buildReservationPricingDraft(data?.locationReservationPricing ?? DEFAULT_RESERVATION_PRICING));
              }}
            >
              Reset form
            </Button>
            <Button
              type="button"
              className="min-w-[180px]"
              disabled={!canManagePricing || loadingPreview || saving}
              onClick={() => void fetchPricingPreview()}
            >
              {loadingPreview || saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save parking setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
