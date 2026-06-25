import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import {
  createOperatorLocationAssignment,
  deleteOperatorLocationAssignment,
  listOperatorLocationAssignments,
} from '@/lib/operatorLocationAccess';
import { getServiceHeaders, readRestList } from '@/lib/operatorLocation';
import { formatRouteValidationIssues, operatorLocationAssignmentRouteRequestSchema } from '@/lib/operatorRouteSchemas';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';
import { getOperatorSupabaseConfig } from '@/lib/supabase';

type DashboardAccountRow = {
  user_id: string;
  display_name: string | null;
  role: string;
};

type LocationRow = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
};

async function loadAssignmentPayload(config: { url: string; serviceRoleKey: string }) {
  const headers = getServiceHeaders(config.serviceRoleKey);
  const [accounts, locations, assignments] = await Promise.all([
    readRestList<DashboardAccountRow>(
      await fetch(
        `${config.url}/rest/v1/admin_user_roles?select=user_id,display_name,role&order=display_name.asc`,
        { headers, cache: 'no-store' },
      ),
    ),
    readRestList<LocationRow>(
      await fetch(
        `${config.url}/rest/v1/locations?select=id,name,address,city&is_active=eq.true&order=created_at.asc`,
        { headers, cache: 'no-store' },
      ),
    ),
    listOperatorLocationAssignments({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
    }),
  ]);

  return { accounts, locations, assignments };
}

async function recordAssignmentAudit({
  config,
  actorUserId,
  userId,
  locationId,
  action,
}: {
  config: { url: string; serviceRoleKey: string };
  actorUserId: string;
  userId: string;
  locationId: string;
  action: 'insert' | 'delete';
}) {
  await fetch(`${config.url}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: getServiceHeaders(config.serviceRoleKey),
    body: JSON.stringify({
      table_name: 'operator_location_assignments',
      record_id: locationId,
      action,
      actor_user_id: actorUserId,
      metadata: {
        assigned_user_id: userId,
        location_id: locationId,
        source: 'operator_location_assignments_route',
      },
    }),
    cache: 'no-store',
  });
}

function ensureAdmin(operatorUser: Awaited<ReturnType<typeof getCurrentOperatorUser>>) {
  return operatorUser?.role === 'admin';
}

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/location-assignments');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can manage operator lot assignments.' }, { status: 403 });
  }

  const config = getOperatorSupabaseConfig();
  if (!config?.url || !config.serviceRoleKey) {
    return jsonWithRequestContext(routeContext, { error: 'Missing operator Supabase configuration.' }, { status: 500 });
  }

  try {
    const payload = await loadAssignmentPayload({ url: config.url, serviceRoleKey: config.serviceRoleKey });
    logOperatorRouteSuccess(routeContext, 'Loaded operator location assignments', {
      assignmentCount: payload.assignments.length,
    });
    return jsonWithRequestContext(routeContext, { ok: true, ...payload });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load operator location assignments', error);
    return jsonWithRequestContext(routeContext, { error: 'Failed to load operator location assignments.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/location-assignments');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can manage operator lot assignments.' }, { status: 403 });
  }

  const parsedBody = operatorLocationAssignmentRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid operator location assignment request.',
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
    const assignment = await createOperatorLocationAssignment({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: parsedBody.data.userId,
      locationId: parsedBody.data.locationId,
      assignedBy: operatorUser.id,
    });
    await recordAssignmentAudit({
      config: { url: config.url, serviceRoleKey: config.serviceRoleKey },
      actorUserId: operatorUser.id,
      userId: parsedBody.data.userId,
      locationId: parsedBody.data.locationId,
      action: 'insert',
    });
    logOperatorRouteSuccess(routeContext, 'Created operator location assignment', parsedBody.data);
    return jsonWithRequestContext(routeContext, { ok: true, assignment });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to create operator location assignment', error, parsedBody.data);
    return jsonWithRequestContext(routeContext, { error: 'Failed to create operator location assignment.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/location-assignments');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can manage operator lot assignments.' }, { status: 403 });
  }

  const parsedBody = operatorLocationAssignmentRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid operator location assignment request.',
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
    const assignment = await deleteOperatorLocationAssignment({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: parsedBody.data.userId,
      locationId: parsedBody.data.locationId,
    });
    await recordAssignmentAudit({
      config: { url: config.url, serviceRoleKey: config.serviceRoleKey },
      actorUserId: operatorUser.id,
      userId: parsedBody.data.userId,
      locationId: parsedBody.data.locationId,
      action: 'delete',
    });
    logOperatorRouteSuccess(routeContext, 'Deleted operator location assignment', parsedBody.data);
    return jsonWithRequestContext(routeContext, { ok: true, assignment });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to delete operator location assignment', error, parsedBody.data);
    return jsonWithRequestContext(routeContext, { error: 'Failed to delete operator location assignment.' }, { status: 500 });
  }
}
