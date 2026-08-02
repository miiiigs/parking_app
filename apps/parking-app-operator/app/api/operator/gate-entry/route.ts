import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { getServiceHeaders } from '@/lib/operatorLocation';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';
import { hasOperatorLocationAssignment } from '@/lib/operatorLocationAccess';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { formatRouteValidationIssues, operatorGateEntryRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { getOperatorSupabaseConfig } from '@/lib/supabase';
import { parseEntryPass } from '@parking/shared';

type GateEntryErrorCode =
  | 'malformed-entry-pass'
  | 'wrong-qr-type'
  | 'entry-pass-reference-only'
  | 'legacy-walkin-pass'
  | 'expired-entry-pass'
  | 'used-entry-pass'
  | 'entry-pass-not-found'
  | 'entry-pass-mismatch'
  | 'validation-unavailable';

function buildGateEntryError(code: GateEntryErrorCode, error: string) {
  return { code, error };
}

function getMalformedEntryPassError(entryPass: string) {
  const normalized = entryPass.trim();
  const upperValue = normalized.toUpperCase();

  if (upperValue.startsWith('EXT-') || upperValue.startsWith('EXIT-')) {
    return buildGateEntryError(
      'wrong-qr-type',
      'This is an exit QR, not an entry QR. Scan the customer entrance pass instead.',
    );
  }

  if (upperValue.startsWith('PAY-') || upperValue.includes('PAYMONGO') || upperValue.includes('QRPH') || upperValue.includes('GCASH') || upperValue.includes('MAYA')) {
    return buildGateEntryError(
      'wrong-qr-type',
      'This looks like a payment QR, not a parking entry QR. Scan the customer entrance pass instead.',
    );
  }

  if (upperValue.startsWith('RSV-') || upperValue.startsWith('WIN-')) {
    return buildGateEntryError(
      'entry-pass-reference-only',
      'The scan captured the booking reference text, not the actual entry QR payload. Open the customer entry QR and scan the code itself.',
    );
  }

  if (normalized.startsWith('walkin-entry-pass|')) {
    return buildGateEntryError(
      'legacy-walkin-pass',
      'This walk-in QR is outdated or incomplete. Ask the customer to reopen the latest walk-in QR before scanning again.',
    );
  }

  if (normalized.startsWith('reservation-entry|')) {
    return buildGateEntryError(
      'malformed-entry-pass',
      'The reservation entry QR looks incomplete or corrupted. Reopen the customer entry QR and scan it again.',
    );
  }

  return buildGateEntryError(
    'malformed-entry-pass',
    'This QR is not a supported parking entry pass. Scan the reservation entry QR or the latest walk-in entrance QR.',
  );
}

function getConfirmationErrorStatus(message: string) {
  if (message.includes('Legacy walk-in entry pass')) {
    return 400;
  }

  if (message.includes('expired')) {
    return 410;
  }

  if (message.includes('already used')) {
    return 409;
  }

  if (message.includes('invalid') || message.includes('does not match') || message.includes('no longer accepted')) {
    return 403;
  }

  if (message.includes('not found')) {
    return 404;
  }

  if (message.includes('Could not find the function public.confirm_parking_entry')) {
    return 503;
  }

  if (message.includes('active operator location')) {
    return 409;
  }

  return 422;
}

function getConfirmationErrorCode(message: string): GateEntryErrorCode | null {
  if (message.includes('Legacy walk-in entry pass')) {
    return 'legacy-walkin-pass';
  }

  if (message.includes('expired')) {
    return 'expired-entry-pass';
  }

  if (message.includes('already used')) {
    return 'used-entry-pass';
  }

  if (message.includes('not found')) {
    return 'entry-pass-not-found';
  }

  if (
    message.includes('invalid')
    || message.includes('does not match')
    || message.includes('no longer accepted')
    || message.includes('type does not match')
  ) {
    return 'entry-pass-mismatch';
  }

  if (message.includes('Could not find the function public.confirm_parking_entry')) {
    return 'validation-unavailable';
  }

  return null;
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/gate-entry');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasOperatorCapability(operatorUser.role, 'edit-slot-status')) {
    return jsonWithRequestContext(routeContext, { error: 'Insufficient permissions to confirm parking entry.' }, { status: 403 });
  }

  const parsedBody = operatorGateEntryRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(routeContext, {
      error: 'Invalid gate entry request.',
      details: formatRouteValidationIssues(parsedBody.error.issues),
    }, { status: 400 });
  }

  const parsedEntryPass = parseEntryPass(parsedBody.data.entryPass);
  if (!parsedEntryPass) {
    return jsonWithRequestContext(routeContext, getMalformedEntryPassError(parsedBody.data.entryPass), { status: 400 });
  }
  const reservationId = parsedEntryPass.reservationId;

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const locationContext = await resolveOperatorLocationContext();
    const activeLocation = locationContext.activeLocation;
    if (!activeLocation) {
      return jsonWithRequestContext(routeContext, { error: 'No active parking location found.' }, { status: 404 });
    }

    const isAssignedToLocation = await hasOperatorLocationAssignment({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: operatorUser.id,
      locationId: activeLocation.id,
    });
    if (!isAssignedToLocation) {
      return jsonWithRequestContext(routeContext, {
        error: 'Operator is not assigned to the active parking location.',
      }, { status: 403 });
    }

    const reservationLookupResponse = await fetch(
      `${config.url}/rest/v1/reservations?select=id,source,slot_id,parking_slots(qr_token)&id=eq.${encodeURIComponent(reservationId)}&limit=1`,
      {
        headers: getServiceHeaders(config.serviceRoleKey),
        cache: 'no-store',
      },
    );
    const reservationLookupPayload = await reservationLookupResponse.json().catch(() => []);
    if (!reservationLookupResponse.ok) {
      return jsonWithRequestContext(
        routeContext,
        buildGateEntryError('validation-unavailable', 'Unable to validate the entry pass right now. Try again in a moment.'),
        { status: 503 },
      );
    }

    const reservationRecord = Array.isArray(reservationLookupPayload) ? reservationLookupPayload[0] ?? null : null;
    if (!reservationRecord) {
      return jsonWithRequestContext(
        routeContext,
        buildGateEntryError('entry-pass-not-found', 'This entry pass could not be found. Ask the customer to reopen the latest entry QR and try again.'),
        { status: 404 },
      );
    }

    const reservationSource = reservationRecord.source === 'walk_in' ? 'walk_in' : 'reservation';
    if (reservationSource !== parsedEntryPass.kind) {
      return jsonWithRequestContext(
        routeContext,
        buildGateEntryError('wrong-qr-type', 'This QR type does not match the saved entry pass. Make sure you are scanning the entrance QR, not a payment, exit, or unrelated code.'),
        { status: 403 },
      );
    }

    const reservationSlot = Array.isArray(reservationRecord.parking_slots)
      ? reservationRecord.parking_slots[0] ?? null
      : reservationRecord.parking_slots ?? null;
    const expectedSlotQrToken = typeof reservationSlot?.qr_token === 'string' ? reservationSlot.qr_token : null;
    if (parsedEntryPass.kind === 'reservation' && parsedEntryPass.slotQrToken && expectedSlotQrToken !== parsedEntryPass.slotQrToken) {
      return jsonWithRequestContext(
        routeContext,
        buildGateEntryError('entry-pass-mismatch', 'This reservation QR does not match the reserved slot anymore. Ask the customer to reopen the latest reservation entry QR and try again.'),
        { status: 403 },
      );
    }
    if (parsedEntryPass.kind === 'walk_in') {
      if (!parsedEntryPass.entryToken) {
        return jsonWithRequestContext(routeContext, {
          code: 'legacy-walkin-pass',
          error: 'Legacy walk-in entry pass detected. Ask the customer to reopen the latest walk-in QR before scanning again.',
        }, { status: 400 });
      }
    }

    const rpcResponse = await fetch(`${config.url}/rest/v1/rpc/confirm_parking_entry`, {
      method: 'POST',
      headers: {
        ...getServiceHeaders(config.serviceRoleKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_reservation_id: reservationId,
        p_location_id: activeLocation.id,
        p_entry_token: parsedEntryPass.kind === 'walk_in' ? parsedEntryPass.entryToken : null,
      }),
      cache: 'no-store',
    });

    const payload = await rpcResponse.json().catch(() => null);
    if (!rpcResponse.ok) {
      const message = payload?.message ?? payload?.error ?? 'Unable to confirm parking entry.';
      const code = getConfirmationErrorCode(message);
      return jsonWithRequestContext(
        routeContext,
        code ? { code, error: message } : { error: message },
        { status: getConfirmationErrorStatus(message) },
      );
    }

    const confirmation = Array.isArray(payload) ? payload[0] ?? null : payload;
    logOperatorRouteSuccess(routeContext, 'Confirmed parking entry', {
      reservationId,
      locationId: activeLocation.id,
      entryPassKind: parsedEntryPass.kind,
      legacyEntryPass: parsedEntryPass.isLegacy,
      idempotentReplay: Boolean(confirmation?.idempotent_replay),
    });

    return jsonWithRequestContext(routeContext, { ok: true, confirmation });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to confirm parking entry', error, { reservationId });
    return jsonWithRequestContext(routeContext, { error: 'Unable to confirm parking entry.' }, { status: 500 });
  }
}
