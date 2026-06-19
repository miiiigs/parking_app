import { buildScopedReconciliationPlan } from '@/lib/operatorReconciliation';
import { buildInFilter, getServiceHeaders, readRestList } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { formatRouteValidationIssues, operatorAdminToolsRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import {
  DEFAULT_RESERVATION_PRICING,
  formatParkingPricingSummary,
  formatReservationPricingSummary,
  normalizeParkingPricingConfig,
  normalizeReservationPricingConfig,
} from '@/lib/parkingPricing';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import { findIdempotentOperatorEvent } from '@/lib/operatorIdempotency';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';

function getHeaders(serviceRoleKey: string) {
  return {
    ...getServiceHeaders(serviceRoleKey),
    Prefer: 'return=representation',
  } as Record<string, string>;
}

type AdminToolPreview = {
  action: 'reconcile' | 'reset-slots' | 'update-pricing';
  title: string;
  summary: string;
  counts: Record<string, number>;
};

function buildPricingPreviewCounts(pricingConfig: ReturnType<typeof normalizeParkingPricingConfig>): Record<string, number> {
  if (pricingConfig.mode === 'flat_rate') {
    return {
      flatRateAmount: pricingConfig.flatRateAmount,
      entryGraceMinutes: pricingConfig.entryGraceMinutes,
      exitGraceMinutes: pricingConfig.exitGraceMinutes,
    };
  }

  if (pricingConfig.mode === 'fixed_rate') {
    return {
      fixedRateAmount: pricingConfig.fixedRateAmount,
      fixedRateIntervalMinutes: pricingConfig.fixedRateIntervalMinutes,
      entryGraceMinutes: pricingConfig.entryGraceMinutes,
      exitGraceMinutes: pricingConfig.exitGraceMinutes,
    };
  }

  return {
    firstPeriodMinutes: pricingConfig.firstPeriodMinutes,
    firstPeriodRate: pricingConfig.firstPeriodRate,
    succeedingRateAmount: pricingConfig.succeedingRateAmount,
    succeedingRateIntervalMinutes: pricingConfig.succeedingRateIntervalMinutes,
    entryGraceMinutes: pricingConfig.entryGraceMinutes,
    exitGraceMinutes: pricingConfig.exitGraceMinutes,
  };
}

function buildMissingPricingSchemaMessage(rawMessage: string) {
  return [
    'Pricing columns are not available in Supabase yet.',
    'Run `supabase/location_pricing_support.sql` in your database, then retry saving pricing.',
    `Database error: ${rawMessage}`,
  ].join(' ');
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/admin-tools');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasOperatorCapability(operatorUser.role, 'manage-pricing')) {
    return jsonWithRequestContext(routeContext, { error: 'Insufficient permissions for pricing settings.' }, { status: 403 });
  }

  try {
    const locationContext = await resolveOperatorLocationContext();
    const location = locationContext.activeLocation;

    if (!location) {
      return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
    }

    const pricingConfig = normalizeParkingPricingConfig({
      mode: location.pricing_mode,
      flatRateAmount: location.flat_rate_amount,
      fixedRateAmount: location.fixed_rate_amount ?? location.fixed_hourly_rate,
      fixedRateIntervalMinutes: location.fixed_rate_interval_minutes,
      firstPeriodMinutes:
        location.first_period_minutes
        ?? (location.first_period_hours ? location.first_period_hours * 60 : undefined),
      firstPeriodRate: location.first_period_rate,
      succeedingRateAmount: location.succeeding_rate_amount ?? location.succeeding_hourly_rate,
      succeedingRateIntervalMinutes: location.succeeding_rate_interval_minutes,
      entryGraceMinutes: location.entry_grace_minutes,
      exitGraceMinutes: location.exit_grace_minutes,
    });
    const reservationPricingConfig = normalizeReservationPricingConfig({
      fee30Minutes: location.reservation_fee_30_minutes ?? DEFAULT_RESERVATION_PRICING.fee30Minutes,
      fee60Minutes: location.reservation_fee_60_minutes ?? DEFAULT_RESERVATION_PRICING.fee60Minutes,
      fee120Minutes: location.reservation_fee_120_minutes ?? DEFAULT_RESERVATION_PRICING.fee120Minutes,
    });

    return jsonWithRequestContext(routeContext, {
      ok: true,
      locationId: location.id,
      locationName: location.name,
      pricingConfig,
      reservationPricingConfig,
      pricingSummary: formatParkingPricingSummary(pricingConfig),
      reservationPricingSummary: formatReservationPricingSummary(reservationPricingConfig),
    });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load pricing settings', error);
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to load pricing settings.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/admin-tools');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  const config = getOperatorSupabaseConfig();

  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  const parsedBody = operatorAdminToolsRouteRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid admin tool request.',
        details: formatRouteValidationIssues(parsedBody.error.issues),
      },
      { status: 400 },
    );
  }

  const { action, preview, pricingConfig: rawPricingConfig, reservationPricingConfig: rawReservationPricingConfig } = parsedBody.data;

  const requiredCapability =
    action === 'reconcile'
      ? 'run-reconciliation'
      : action === 'reset-slots'
        ? 'reset-slot-statuses'
        : action === 'update-pricing'
          ? 'manage-pricing'
        : null;

  if (!requiredCapability || !hasOperatorCapability(operatorUser.role, requiredCapability)) {
    return jsonWithRequestContext(routeContext, { error: 'Insufficient permissions for admin tool action.' }, { status: 403 });
  }

  const headers = getHeaders(config.serviceRoleKey);

  try {
    const locationContext = await resolveOperatorLocationContext();
    const location = locationContext.activeLocation;

    if (!location) {
      return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
    }

    if (action === 'reconcile') {
      const replayEvent = await findIdempotentOperatorEvent({
        url: config.url,
        serviceRoleKey: config.serviceRoleKey,
        eventTypes: ['reconciliation_completed'],
        context: routeContext,
      });

      if (replayEvent?.payload?.response_payload && typeof replayEvent.payload.response_payload === 'object') {
        logOperatorRouteSuccess(routeContext, 'Replayed idempotent reconciliation action', {
          locationId: location.id,
          action,
        });
        return jsonWithRequestContext(routeContext, {
          ...(replayEvent.payload.response_payload as Record<string, unknown>),
          idempotentReplay: true,
        });
      }

      const slotRows = await readRestList<{
        id: string;
        slot_label: string;
        status: 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';
      }>(
        await fetch(
          `${config.url}/rest/v1/parking_slots?select=id,slot_label,status&location_id=eq.${location.id}&order=display_order.asc`,
          { headers, cache: 'no-store' },
        ),
      );
      const slotIds = slotRows.map((slot) => slot.id);
      const slotIdFilter = slotIds.length > 0 ? buildInFilter(slotIds) : null;
      const [reservationRows, sessionRows] = await Promise.all([
        slotIdFilter
          ? readRestList<{ slot_id: string; status: string }>(
              await fetch(
                `${config.url}/rest/v1/reservations?select=slot_id,status&slot_id=in.(${slotIdFilter})`,
                { headers, cache: 'no-store' },
              ),
            )
          : Promise.resolve([]),
        slotIdFilter
          ? readRestList<{ slot_id: string; status: string }>(
              await fetch(
                `${config.url}/rest/v1/parking_sessions?select=slot_id,status&slot_id=in.(${slotIdFilter})`,
                { headers, cache: 'no-store' },
              ),
            )
          : Promise.resolve([]),
      ]);

      const reconciliation = buildScopedReconciliationPlan({
        slotRows,
        reservationRows,
        sessionRows,
      });

      const previewPayload: AdminToolPreview = {
        action: 'reconcile',
        title: 'Run Reconciliation',
        summary:
          reconciliation.fixedCount === 0
            ? `No mismatches will be changed in ${location.name}.`
            : `${reconciliation.fixedCount} slot state changes will be applied in ${location.name}.`,
        counts: {
          slotCount: slotRows.length,
          mismatchCount: reconciliation.mismatchCount,
          fixedCount: reconciliation.fixedCount,
        },
      };

      if (preview) {
        return jsonWithRequestContext(routeContext, { ok: true, preview: previewPayload });
      }

      for (const fix of reconciliation.fixes) {
        const response = await fetch(`${config.url}/rest/v1/parking_slots?id=eq.${fix.slot_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: fix.fixed_status }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }
      }

      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const message =
        reconciliation.fixedCount === 0
          ? `No mismatches found for ${location.name}.`
          : `Reconciliation applied to ${location.name}.`;

      const responsePayload = {
        ok: true,
        payload: reconciliation.fixes,
        message,
      };

      await fetch(`${config.url}/rest/v1/operator_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'reconciliation_completed',
          payload: {
            idempotency_key: routeContext.idempotencyKey,
            request_id: routeContext.requestId,
            location_id: location.id,
            location_name: location.name,
            operator: operatorUser.name,
            actor_user_id: operatorUser.id,
            actor_role: operatorUser.role,
            run_status: 'completed',
            mismatch_count: reconciliation.mismatchCount,
            fixed_count: reconciliation.fixedCount,
            message,
            started_at: startedAt,
            completed_at: completedAt,
            fixes: reconciliation.fixes,
            impact_summary: previewPayload.counts,
            action_scope: 'location',
            confirmed_at: completedAt,
            response_payload: responsePayload,
          },
        }),
      });

      logOperatorRouteSuccess(routeContext, 'Completed reconciliation', {
        locationId: location.id,
        mismatchCount: reconciliation.mismatchCount,
        fixedCount: reconciliation.fixedCount,
      });

      return jsonWithRequestContext(routeContext, responsePayload);
    }

    if (action === 'reset-slots') {
      const replayEvent = await findIdempotentOperatorEvent({
        url: config.url,
        serviceRoleKey: config.serviceRoleKey,
        eventTypes: ['parking_slots_reset'],
        context: routeContext,
      });

      if (replayEvent?.payload?.response_payload && typeof replayEvent.payload.response_payload === 'object') {
        logOperatorRouteSuccess(routeContext, 'Replayed idempotent reset slots action', {
          locationId: location.id,
          action,
        });
        return jsonWithRequestContext(routeContext, {
          ...(replayEvent.payload.response_payload as Record<string, unknown>),
          idempotentReplay: true,
        });
      }

      const slotRows = await readRestList<{ status: string }>(
        await fetch(
          `${config.url}/rest/v1/parking_slots?select=status&location_id=eq.${location.id}`,
          { headers, cache: 'no-store' },
        ),
      );
      const nonAvailableCount = slotRows.filter((slot) => slot.status !== 'available').length;
      const previewPayload: AdminToolPreview = {
        action: 'reset-slots',
        title: 'Reset Slot Statuses',
        summary:
          nonAvailableCount === 0
            ? `All slots in ${location.name} are already available.`
            : `${nonAvailableCount} slot statuses will be reset to available in ${location.name}.`,
        counts: {
          slotCount: slotRows.length,
          changedSlotCount: nonAvailableCount,
        },
      };

      if (preview) {
        return jsonWithRequestContext(routeContext, { ok: true, preview: previewPayload });
      }

      const slotResetResponse = await fetch(`${config.url}/rest/v1/parking_slots?location_id=eq.${location.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'available' }),
      });

      if (!slotResetResponse.ok) {
        throw new Error(await slotResetResponse.text());
      }

      const responsePayload = {
        ok: true,
        message: 'All slot statuses reset to available.',
      };

      await fetch(`${config.url}/rest/v1/operator_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'parking_slots_reset',
          payload: {
            idempotency_key: routeContext.idempotencyKey,
            request_id: routeContext.requestId,
            status: 'available',
            location_id: location.id,
            location_name: location.name,
            operator: operatorUser.name,
            actor_user_id: operatorUser.id,
            actor_role: operatorUser.role,
            impact_summary: previewPayload.counts,
            action_scope: 'location',
            confirmed_at: new Date().toISOString(),
            response_payload: responsePayload,
          },
        }),
      });

      logOperatorRouteSuccess(routeContext, 'Reset slot statuses', {
        locationId: location.id,
        changedSlotCount: previewPayload.counts.changedSlotCount ?? 0,
      });

      return jsonWithRequestContext(routeContext, responsePayload);
    }

    if (action === 'update-pricing') {
      const pricingConfig = normalizeParkingPricingConfig(rawPricingConfig ?? null);
      const reservationPricingConfig = normalizeReservationPricingConfig(rawReservationPricingConfig ?? null);
      const previewPayload: AdminToolPreview = {
        action: 'update-pricing',
        title: 'Update Parking Pricing',
        summary: `${location.name} will use ${formatParkingPricingSummary(pricingConfig)} with ${formatReservationPricingSummary(reservationPricingConfig)} reservation fees and ${pricingConfig.entryGraceMinutes} min entry grace / ${pricingConfig.exitGraceMinutes} min exit grace.`,
        counts: {
          ...buildPricingPreviewCounts(pricingConfig),
          fee30Minutes: reservationPricingConfig.fee30Minutes,
          fee60Minutes: reservationPricingConfig.fee60Minutes,
          fee120Minutes: reservationPricingConfig.fee120Minutes,
        },
      };

      if (preview) {
        return jsonWithRequestContext(routeContext, { ok: true, preview: previewPayload });
      }

      const updateResponse = await fetch(`${config.url}/rest/v1/locations?id=eq.${location.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          pricing_mode: pricingConfig.mode,
          flat_rate_amount: pricingConfig.flatRateAmount,
          fixed_rate_amount: pricingConfig.fixedRateAmount,
          fixed_rate_interval_minutes: pricingConfig.fixedRateIntervalMinutes,
          first_period_minutes: pricingConfig.firstPeriodMinutes,
          first_period_rate: pricingConfig.firstPeriodRate,
          succeeding_rate_amount: pricingConfig.succeedingRateAmount,
          succeeding_rate_interval_minutes: pricingConfig.succeedingRateIntervalMinutes,
          entry_grace_minutes: pricingConfig.entryGraceMinutes,
          exit_grace_minutes: pricingConfig.exitGraceMinutes,
          reservation_fee_30_minutes: reservationPricingConfig.fee30Minutes,
          reservation_fee_60_minutes: reservationPricingConfig.fee60Minutes,
          reservation_fee_120_minutes: reservationPricingConfig.fee120Minutes,
        }),
      });

      if (!updateResponse.ok) {
        const rawMessage = await updateResponse.text();
        if (
          rawMessage.includes('PGRST204')
          || rawMessage.includes('entry_grace_minutes')
          || rawMessage.includes('pricing_mode')
          || rawMessage.includes('fixed_rate_interval_minutes')
          || rawMessage.includes('reservation_fee_30_minutes')
        ) {
          throw new Error(buildMissingPricingSchemaMessage(rawMessage));
        }

        throw new Error(rawMessage);
      }

      const responsePayload = {
        ok: true,
        message: `Pricing updated for ${location.name}.`,
        pricingConfig,
        reservationPricingConfig,
        pricingSummary: formatParkingPricingSummary(pricingConfig),
        reservationPricingSummary: formatReservationPricingSummary(reservationPricingConfig),
      };

      await fetch(`${config.url}/rest/v1/operator_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'location_pricing_updated',
          payload: {
            idempotency_key: routeContext.idempotencyKey,
            request_id: routeContext.requestId,
            location_id: location.id,
            location_name: location.name,
            operator: operatorUser.name,
            actor_user_id: operatorUser.id,
            actor_role: operatorUser.role,
            pricing_config: pricingConfig,
            pricing_summary: formatParkingPricingSummary(pricingConfig),
            reservation_pricing_config: reservationPricingConfig,
            reservation_pricing_summary: formatReservationPricingSummary(reservationPricingConfig),
            impact_summary: previewPayload.counts,
            action_scope: 'location',
            confirmed_at: new Date().toISOString(),
            response_payload: responsePayload,
          },
        }),
      });

      logOperatorRouteSuccess(routeContext, 'Updated location pricing', {
        locationId: location.id,
        pricingMode: pricingConfig.mode,
      });

      return jsonWithRequestContext(routeContext, responsePayload);
    }

    return jsonWithRequestContext(routeContext, { error: `Unsupported admin tool action: ${action}` }, { status: 400 });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Admin tool action failed', error, {
      action,
    });
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Admin tool action failed.' },
      { status: 500 },
    );
  }
}
