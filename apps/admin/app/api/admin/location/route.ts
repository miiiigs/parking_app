import { NextResponse } from 'next/server';

import { getCurrentAdminUser } from '../../../../lib/adminAuth';
import {
  resolveAdminLocationContext,
  setAdminLocationSelection,
} from '../../../../lib/adminLocationServer';

export async function GET() {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const context = await resolveAdminLocationContext();
  return NextResponse.json(context);
}

export async function POST(request: Request) {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const locationId = String(body?.locationId ?? '').trim();

  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required.' }, { status: 400 });
  }

  try {
    const context = await setAdminLocationSelection(locationId);
    return NextResponse.json({ ok: true, ...context });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update admin location.' },
      { status: 400 },
    );
  }
}
