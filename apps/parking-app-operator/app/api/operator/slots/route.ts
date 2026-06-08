import { NextResponse } from 'next/server';

import { getCurrentOperatorUser } from '@/lib/operatorAuth';
import { resolveOperatorLocationContext } from '@/lib/operatorLocationServer';

export async function PATCH(request: Request) {
  const operatorUser = await getCurrentOperatorUser();

  if (!operatorUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    return NextResponse.json({ error: 'Missing SUPABASE URL' }, { status: 500 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { slotId, updates } = body ?? {};

  if (!slotId || !updates) {
    return NextResponse.json({ error: 'slotId and updates are required' }, { status: 400 });
  }

  const normalizedUpdates = { ...updates };

  if (normalizedUpdates.status === 'maintenance') {
    normalizedUpdates.status = 'blocked';
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  } as Record<string, string>;

  const locationContext = await resolveOperatorLocationContext();
  const activeLocation = locationContext.activeLocation;

  if (!activeLocation) {
    return NextResponse.json({ error: 'No active parking location found.' }, { status: 404 });
  }

  const existingSlotResponse = await fetch(
    `${url}/rest/v1/parking_slots?select=id,status,location_id&id=eq.${encodeURIComponent(String(slotId))}&limit=1`,
    {
      headers,
      cache: 'no-store',
    },
  );

  if (!existingSlotResponse.ok) {
    const txt = await existingSlotResponse.text().catch(() => 'unknown error');
    return NextResponse.json({ error: txt }, { status: 500 });
  }

  const existingSlotRows = (await existingSlotResponse.json().catch(() => [])) as Array<{ id: string; status: string; location_id: string }>;
  const existingSlot = existingSlotRows[0] ?? null;
  if (!existingSlot) {
    return NextResponse.json({ error: 'Parking slot not found.' }, { status: 404 });
  }

  if (existingSlot.location_id !== activeLocation.id) {
    return NextResponse.json({ error: 'Parking slot does not belong to the active operator location.' }, { status: 409 });
  }

  const previousStatus = existingSlot.status ?? null;

  // Use PostgREST to update the parking_slots row
  const resp = await fetch(`${url}/rest/v1/parking_slots?id=eq.${encodeURIComponent(String(slotId))}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(normalizedUpdates),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => 'unknown error');
    return NextResponse.json({ error: txt }, { status: 500 });
  }

  const payload = await resp.json().catch(() => null);

  await fetch(`${url}/rest/v1/operator_events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      slot_id: slotId,
      event_type: 'slot_status_changed',
      payload: {
        status: normalizedUpdates.status,
        previous_status: previousStatus,
        operator: operatorUser.name,
        actor_user_id: operatorUser.id,
        actor_role: operatorUser.role,
      },
    }),
  });

  return NextResponse.json({ ok: true, payload });
}
