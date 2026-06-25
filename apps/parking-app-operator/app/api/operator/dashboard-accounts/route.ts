import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import {
  findAuthUserByEmail,
  inviteAuthUserByEmail,
  readDashboardRoleAccount,
  upsertDashboardRoleAccount,
} from '@/lib/operatorAdminAccess';
import { getServiceHeaders } from '@/lib/operatorLocation';
import {
  formatRouteValidationIssues,
  operatorDashboardAccountProvisionRouteRequestSchema,
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

function getProvisioningErrorMessage(message: string) {
  if (message.includes('Unable to look up Supabase Auth users') || message.includes('Unable to invite Supabase Auth user')) {
    return message;
  }

  return 'Failed to provision dashboard account.';
}

async function recordDashboardAccountAudit({
  config,
  actorUserId,
  action,
  recordId,
  beforeData,
  afterData,
  metadata,
}: {
  config: { url: string; serviceRoleKey: string };
  actorUserId: string;
  action: 'insert' | 'update';
  recordId: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  await fetch(`${config.url}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: getServiceHeaders(config.serviceRoleKey),
    body: JSON.stringify({
      table_name: 'admin_user_roles',
      record_id: recordId,
      action,
      actor_user_id: actorUserId,
      before_data: beforeData ?? null,
      after_data: afterData ?? null,
      metadata: metadata ?? {},
    }),
    cache: 'no-store',
  });
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/dashboard-accounts');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdmin(operatorUser)) {
    return jsonWithRequestContext(routeContext, { error: 'Only admin users can provision dashboard accounts.' }, { status: 403 });
  }

  const parsedBody = operatorDashboardAccountProvisionRouteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonWithRequestContext(
      routeContext,
      {
        error: 'Invalid dashboard account provisioning request.',
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
    const requestedDisplayName = parsedBody.data.displayName.trim();
    const existingAuthUser = await findAuthUserByEmail({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      email: parsedBody.data.email,
    });
    const invitedNewAuthUser = !existingAuthUser;

    const authUser =
      existingAuthUser
      ?? await inviteAuthUserByEmail({
        url: config.url,
        serviceRoleKey: config.serviceRoleKey,
        email: parsedBody.data.email,
        displayName: requestedDisplayName,
        redirectTo: new URL('/login', request.url).toString(),
      });

    const previousRole = await readDashboardRoleAccount({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: authUser.id,
    });

    const displayName =
      requestedDisplayName
      || authUser.displayName
      || authUser.email
      || authUser.phone
      || null;

    const account = await upsertDashboardRoleAccount({
      url: config.url,
      serviceRoleKey: config.serviceRoleKey,
      userId: authUser.id,
      role: parsedBody.data.role,
      displayName,
    });

    await recordDashboardAccountAudit({
      config: { url: config.url, serviceRoleKey: config.serviceRoleKey },
      actorUserId: operatorUser.id,
      action: previousRole ? 'update' : 'insert',
      recordId: authUser.id,
      beforeData: previousRole,
      afterData: account,
      metadata: {
        source: 'dashboard_account_provisioning_route',
        email: authUser.email,
        phone: authUser.phone,
        invited_new_auth_user: invitedNewAuthUser,
      },
    });

    logOperatorRouteSuccess(routeContext, 'Provisioned dashboard account role', {
      userId: authUser.id,
      email: authUser.email,
      role: parsedBody.data.role,
      invitedNewAuthUser,
      updatedExistingRole: Boolean(previousRole),
    });

    return jsonWithRequestContext(routeContext, {
      ok: true,
      account,
      authUser,
      invitedNewAuthUser,
      onboardingAction: invitedNewAuthUser
        ? 'invited-new-user'
        : previousRole
          ? 'updated-existing-role'
          : 'granted-existing-user',
      message: invitedNewAuthUser
        ? 'Dashboard invite sent and access prepared for the new Supabase Auth account.'
        : previousRole
          ? 'Dashboard role updated for the existing account.'
          : 'Dashboard access granted to the existing Supabase Auth account.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to provision dashboard account.';
    logOperatorRouteError(routeContext, 'Failed to provision dashboard account', error, {
      email: parsedBody.data.email,
      role: parsedBody.data.role,
    });
    return jsonWithRequestContext(routeContext, { error: getProvisioningErrorMessage(message) }, { status: 500 });
  }
}
