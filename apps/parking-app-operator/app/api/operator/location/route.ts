import { NextResponse } from 'next/server';

import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import {
  resolveOperatorLocationContext,
  setOperatorLocationSelection,
} from '@/lib/operatorLocationServer';

export async function GET() {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const context = await resolveOperatorLocationContext();
  return NextResponse.json(context);
}

export async function POST(request: Request) {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const locationId = String(body?.locationId ?? '').trim();

  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required.' }, { status: 400 });
  }

  try {
    const context = await setOperatorLocationSelection(locationId);
    return NextResponse.json({ ok: true, ...context });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update operator location.' },
      { status: 400 },
    );
  }
}
