import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import {
  resolveOperatorLocationContext,
  setOperatorLocationSelection,
} from '@/lib/operatorLocationServer';
import { createOperatorRouteContext, jsonWithRequestContext, logOperatorRouteError, logOperatorRouteSuccess } from '@/lib/operatorRequestContext';

export async function GET(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/location');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const context = await resolveOperatorLocationContext();
    logOperatorRouteSuccess(routeContext, 'Loaded operator location context', {
      locationId: context.activeLocation?.id ?? null,
    });
    return jsonWithRequestContext(routeContext, context);
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to load operator location context', error);
    return jsonWithRequestContext(routeContext, { error: 'Failed to load operator location.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const routeContext = createOperatorRouteContext(request, '/api/operator/location');
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return jsonWithRequestContext(routeContext, { error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const locationId = String(body?.locationId ?? '').trim();

  if (!locationId) {
    return jsonWithRequestContext(routeContext, { error: 'locationId is required.' }, { status: 400 });
  }

  try {
    const context = await setOperatorLocationSelection(locationId);
    logOperatorRouteSuccess(routeContext, 'Updated operator location selection', {
      locationId,
    });
    return jsonWithRequestContext(routeContext, { ok: true, ...context });
  } catch (error) {
    logOperatorRouteError(routeContext, 'Failed to update operator location', error, {
      locationId,
    });
    return jsonWithRequestContext(
      routeContext,
      { error: error instanceof Error ? error.message : 'Failed to update operator location.' },
      { status: 400 },
    );
  }
}
