import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import {
  createManagedLocation,
  listManagedLocations,
  updateManagedLocation,
} from '@/lib/operatorAdminAccess';
import { getServiceHeaders } from '@/lib/operatorLocation';
import {
  formatRouteValidationIssues,
  operatorLocationCreateRouteRequestSchema,
  operatorLocationUpdateRouteRequestSchema,
} from '@/lib/operatorRouteSchemas';
import {
  createOperatorRouteContext,
  jsonWithRequestContext,
  logOperatorRouteError,
  logOperatorRouteSuccess,
} from '@/lib/operatorRequestContext';
import { getOperatorSupabaseConfig } from '@/lib/supabase';

function ensureAdmin(operatorUser: Awaited<ReturnType<typeof getCurrentOperatorUser>>) {
  return operatorUser?.role === 'admin';
}

function getLocationErrorMessage(message: string) {
  if (message.includes('duplicate key value violates unique constraint') || message.includes('locations_code_key')) {
    return 'A parking lot with that code already exists. Choose a different code.';
  }

  return 'Failed to update parking lot records.';
}

async function recordLocationAudit({
  config,
  actorUserId,
  locationId,
  action,
  beforeData,
  afterData,
}: {
  config: { url: string; serviceRoleKey: string };
  actorUserId: string;
  locationId: string;
  action: 'insert' | 'update';
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
}) {
  await fetch(`${config.url}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: getServiceHeaders(config.serviceRoleKey),
    body: JSON.stringify({
      table_name: 'locations',
      record_id: locationId,
      action,
      actor_user_id: actorUserId,
      before_data: beforeData ?? null,
      after_data: afterData ?? null,
      metadata: {
        source: 'operator_locations_route',
      },
    }),
    cache: 'no-store',
  });
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/locations');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can manage parking lots.' }, { status: 403 });
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const locations = await listManagedLocations({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
    });
    logOperatorRouteSuccess(routeContext, 'Loaded managed parking lots', {
      locationCount: locations.length,
    });
    return jsonWithRequestContext(routeContext, { ok: true, locations });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load managed parking lots', error);
    return jsonWithRequestContext(routeContext, { error: 'Failed to load managed parking lots.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/locations');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can manage parking lots.' }, { status: 403 });
  }

  const parsedBody = operatorLocationCreateRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid parking lot create request.',
        details: formatRouteValidationIssues(parsedBody.error.issues),
      },
      { status: 400 },
    );
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const location = await createManagedLocation({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      name: parsedBody.data.name,
      code: parsedBody.data.code,
      address: parsedBody.data.address,
      city: parsedBody.data.city,
      isActive: parsedBody.data.isActive,
    });

    if (!location) {
      throw new Error('Parking lot create returned no record.');
    }

    await recordLocationAudit({
      config: { url: config.url, serviceRoleKey: config.serviceRoleKey },
      actorUserId: operatorUser.id,
      locationId: location.id,
      action: 'insert',
      afterData: location,
    });

    logOperatorRouteSuccess(routeContext, 'Created managed parking lot', {
      locationId: location.id,
      code: location.code,
      isActive: location.is_active,
    });

    return jsonWithRequestContext(routeContext, {
      ok: true,
      location,
      message: 'Parking lot created. Configure slots and layout next if this lot is brand new.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create parking lot.';
    logOperatorRouteError(routeContext, 'Failed to create managed parking lot', error, parsedBody.data);
    return jsonWithRequestContext(routeContext, { error: getLocationErrorMessage(message) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/locations');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can manage parking lots.' }, { status: 403 });
  }

  const parsedBody = operatorLocationUpdateRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid parking lot update request.',
        details: formatRouteValidationIssues(parsedBody.error.issues),
      },
      { status: 400 },
    );
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const existingLocation = (await listManagedLocations({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
    })).find((location) => location.id === parsedBody.data.locationId);

    const location = await updateManagedLocation({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      locationId: parsedBody.data.locationId,
      name: parsedBody.data.name,
      code: parsedBody.data.code,
      address: parsedBody.data.address,
      city: parsedBody.data.city,
      isActive: parsedBody.data.isActive,
    });

    if (!location) {
      throw new Error('Parking lot update returned no record.');
    }

    await recordLocationAudit({
      config: { url: config.url, serviceRoleKey: config.serviceRoleKey },
      actorUserId: operatorUser.id,
      locationId: location.id,
      action: 'update',
      beforeData: existingLocation ?? null,
      afterData: location,
    });

    logOperatorRouteSuccess(routeContext, 'Updated managed parking lot', {
      locationId: location.id,
      code: location.code,
      isActive: location.is_active,
    });

    return jsonWithRequestContext(routeContext, {
      ok: true,
      location,
      message: location.is_active
        ? 'Parking lot details saved.'
        : 'Parking lot deactivated. Mobile and operator location lists will now treat it as inactive.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update parking lot.';
    logOperatorRouteError(routeContext, 'Failed to update managed parking lot', error, parsedBody.data);
    return jsonWithRequestContext(routeContext, { error: getLocationErrorMessage(message) }, { status: 500 });
  }
}
