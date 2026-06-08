import { NextResponse } from 'next/server';

import { buildLocationScopedAdminResetTargets } from '@/lib/operatorAdminScope';
import { buildScopedReconciliationPlan } from '@/lib/operatorReconciliation';
import {
  buildInFilter,
  getServiceHeaders,
  readRestList,
} from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { getOperatorSupabaseConfig } from '@/lib/supabase';

function getHeaders(serviceRoleKey: string) {
  return {
    ...getServiceHeaders(serviceRoleKey),
    Prefer: 'return=representation',
  } as Record<string, string>;
}

type AdminToolPreview = {
  action: 'reconcile' | 'reset-slots' | 'reset-demo';
  title: string;
  summary: string;
  counts: Record<string, number>;
};

async function deleteRowsByIds(
  baseUrl: string,
  headers: Record<string, string>,
  tableName: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return;
  }

  const response = await fetch(`${baseUrl}/rest/v1/${tableName}?id=in.(${buildInFilter(ids)})`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function POST(request: Request) {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getOperatorSupabaseConfig();

  if (!config?.url || !config.serviceRoleKey) {
    return NextResponse.json({ error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  const { action, preview } = (await request.json().catch(() => ({}))) as { action?: string; preview?: boolean };

  if (!action) {
    return NextResponse.json({ error: 'Missing admin tool action.' }, { status: 400 });
  }

  const headers = getHeaders(config.serviceRoleKey);

  try {
    const locationContext = await resolveOperatorLocationContext();
    const location = locationContext.activeLocation;

    if (!location) {
      return NextResponse.json({ error: 'No active parking location found.' }, { status: 404 });
    }

    if (action === 'reconcile') {
      if (!['admin', 'operator'].includes(operatorUser.role)) {
        return NextResponse.json({ error: 'Insufficient permissions for reconciliation.' }, { status: 403 });
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
        return NextResponse.json({ ok: true, preview: previewPayload });
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

      await fetch(`${config.url}/rest/v1/operator_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'reconciliation_completed',
          payload: {
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
          },
        }),
      });

      return NextResponse.json({
        ok: true,
        payload: reconciliation.fixes,
        message,
      });
    }

    if (action === 'reset-slots') {
      if (!['admin', 'operator'].includes(operatorUser.role)) {
        return NextResponse.json({ error: 'Insufficient permissions for slot reset.' }, { status: 403 });
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
        return NextResponse.json({ ok: true, preview: previewPayload });
      }

      const slotResetResponse = await fetch(`${config.url}/rest/v1/parking_slots?location_id=eq.${location.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'available' }),
      });

      if (!slotResetResponse.ok) {
        throw new Error(await slotResetResponse.text());
      }

      await fetch(`${config.url}/rest/v1/operator_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'parking_slots_reset',
          payload: {
            status: 'available',
            location_id: location.id,
            location_name: location.name,
            operator: operatorUser.name,
            actor_user_id: operatorUser.id,
            actor_role: operatorUser.role,
            impact_summary: previewPayload.counts,
            action_scope: 'location',
            confirmed_at: new Date().toISOString(),
          },
        }),
      });

      return NextResponse.json({ ok: true, message: 'All slot statuses reset to available.' });
    }

    if (action === 'reset-demo') {
      if (operatorUser.role !== 'admin') {
        return NextResponse.json({ error: 'Only admin users can run a full demo reset.' }, { status: 403 });
      }

      const slotRows = await readRestList<{ id: string }>(
        await fetch(
          `${config.url}/rest/v1/parking_slots?select=id&location_id=eq.${location.id}&order=display_order.asc`,
          { headers, cache: 'no-store' },
        ),
      );
      const slotIds = slotRows.map((slot) => slot.id);

      const [reservationRows, sessionRows, paymentRows, operatorEventRows] = await Promise.all([
        readRestList<{ id: string; slot_id: string | null }>(
          await fetch(
            `${config.url}/rest/v1/reservations?select=id,slot_id`,
            { headers, cache: 'no-store' },
          ),
        ),
        readRestList<{ id: string; reservation_id: string | null; slot_id: string | null }>(
          await fetch(
            `${config.url}/rest/v1/parking_sessions?select=id,reservation_id,slot_id`,
            { headers, cache: 'no-store' },
          ),
        ),
        readRestList<{ id: string; reservation_id: string | null; session_id: string | null }>(
          await fetch(
            `${config.url}/rest/v1/payments?select=id,reservation_id,session_id`,
            { headers, cache: 'no-store' },
          ),
        ),
        readRestList<{ id: string; slot_id: string | null; reservation_id: string | null; session_id: string | null; payload: Record<string, unknown> | null }>(
          await fetch(
            `${config.url}/rest/v1/operator_events?select=id,slot_id,reservation_id,session_id,payload`,
            { headers, cache: 'no-store' },
          ),
        ),
      ]);

      const scopedTargets = buildLocationScopedAdminResetTargets({
        locationId: location.id,
        locationSlotIds: slotIds,
        reservations: reservationRows.map((row) => ({
          id: row.id,
          slotId: row.slot_id,
        })),
        sessions: sessionRows.map((row) => ({
          id: row.id,
          reservationId: row.reservation_id,
          slotId: row.slot_id,
        })),
        payments: paymentRows.map((row) => ({
          id: row.id,
          reservationId: row.reservation_id,
          sessionId: row.session_id,
        })),
        operatorEvents: operatorEventRows.map((row) => ({
          id: row.id,
          slotId: row.slot_id,
          reservationId: row.reservation_id,
          sessionId: row.session_id,
          payload: row.payload,
        })),
      });

      const previewPayload: AdminToolPreview = {
        action: 'reset-demo',
        title: 'Full Demo Reset',
        summary: `This will clear pilot records for ${location.name} and return all slots to available.`,
        counts: {
          slotCount: slotIds.length,
          reservationCount: scopedTargets.reservationIds.length,
          sessionCount: scopedTargets.sessionIds.length,
          paymentCount: scopedTargets.paymentIds.length,
          operatorEventCount: scopedTargets.operatorEventIds.length,
        },
      };

      if (preview) {
        return NextResponse.json({ ok: true, preview: previewPayload });
      }

      await deleteRowsByIds(config.url, headers, 'operator_events', scopedTargets.operatorEventIds);
      await deleteRowsByIds(config.url, headers, 'payments', scopedTargets.paymentIds);
      await deleteRowsByIds(config.url, headers, 'parking_sessions', scopedTargets.sessionIds);
      await deleteRowsByIds(config.url, headers, 'reservations', scopedTargets.reservationIds);

      const slotResetResponse = await fetch(`${config.url}/rest/v1/parking_slots?location_id=eq.${location.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'available' }),
      });

      if (!slotResetResponse.ok) {
        throw new Error(await slotResetResponse.text());
      }

      await fetch(`${config.url}/rest/v1/operator_events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event_type: 'demo_state_reset',
          payload: {
            status: 'available',
            location_id: location.id,
            location_name: location.name,
            slot_count: slotIds.length,
            reservation_count: scopedTargets.reservationIds.length,
            session_count: scopedTargets.sessionIds.length,
            payment_count: scopedTargets.paymentIds.length,
            operator_event_count: scopedTargets.operatorEventIds.length,
            operator: operatorUser.name,
            actor_user_id: operatorUser.id,
            actor_role: operatorUser.role,
            impact_summary: previewPayload.counts,
            action_scope: 'location',
            confirmed_at: new Date().toISOString(),
          },
        }),
      });

      return NextResponse.json({ ok: true, message: 'Demo data reset completed.' });
    }

    return NextResponse.json({ error: `Unsupported admin tool action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin tool action failed.' },
      { status: 500 },
    );
  }
}
