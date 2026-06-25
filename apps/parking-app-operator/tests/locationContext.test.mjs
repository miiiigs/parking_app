import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertOperatorLocationRequest,
  pickOperatorLocation,
} from '../lib/operatorLocation.ts';
import {
  createManagedLocation,
  inviteAuthUserByEmail,
  listManagedLocations,
  normalizeManagedLocationCode,
  upsertDashboardRoleAccount,
  updateManagedLocation,
} from '../lib/operatorAdminAccess.ts';
import { hasOperatorLocationAssignment, listOperatorLocationAssignments } from '../lib/operatorLocationAccess.ts';

test('prefers the selected operator location when it is active', () => {
  const locations = [
    { id: 'lot-a', name: 'Lot A' },
    { id: 'lot-b', name: 'Lot B' },
  ];

  const selected = pickOperatorLocation(locations, 'lot-b');

  assert.deepEqual(selected, { id: 'lot-b', name: 'Lot B' });
});

test('falls back to the first active location when the selected one is missing', () => {
  const locations = [
    { id: 'lot-a', name: 'Lot A' },
    { id: 'lot-b', name: 'Lot B' },
  ];

  const selected = pickOperatorLocation(locations, 'lot-c');

  assert.deepEqual(selected, { id: 'lot-a', name: 'Lot A' });
});

test('rejects API requests that target a different location than the active operator context', () => {
  assert.throws(
    () => assertOperatorLocationRequest('lot-a', 'lot-b'),
    /does not match the active operator location/i,
  );
});

test('allows API requests that target the active operator location', () => {
  assert.doesNotThrow(() => assertOperatorLocationRequest('lot-a', 'lot-a'));
  assert.doesNotThrow(() => assertOperatorLocationRequest('lot-a', null));
});

test('allows gate mutation only when the authenticated operator has a durable location assignment', async () => {
  const assigned = await hasOperatorLocationAssignment({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    userId: 'operator-a',
    locationId: 'lot-a',
    fetcher: async () => new Response(JSON.stringify([{ user_id: 'operator-a', location_id: 'lot-a' }]), { status: 200 }),
  });

  assert.equal(assigned, true);
});

test('denies cross-location gate mutation when no matching assignment exists', async () => {
  const assigned = await hasOperatorLocationAssignment({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    userId: 'operator-a',
    locationId: 'lot-b',
    fetcher: async () => new Response(JSON.stringify([{ user_id: 'operator-a', location_id: 'lot-a' }]), { status: 200 }),
  });

  assert.equal(assigned, false);
});

test('lists only the requested operator location assignments when a user id is provided', async () => {
  let requestedUrl = '';
  const assignments = await listOperatorLocationAssignments({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    userId: 'operator-a',
    fetcher: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify([{ user_id: 'operator-a', location_id: 'lot-a' }]), { status: 200 });
    },
  });

  assert.equal(requestedUrl.includes('operator_location_assignments'), true);
  assert.equal(requestedUrl.includes('user_id=eq.operator-a'), true);
  assert.deepEqual(assignments, [{ user_id: 'operator-a', location_id: 'lot-a' }]);
});

test('normalizes parking lot codes into a stable dashboard-safe format', () => {
  assert.equal(normalizeManagedLocationCode(' bgc pilot site '), 'BGC-PILOT-SITE');
  assert.equal(normalizeManagedLocationCode('makati_business_hub'), 'MAKATI-BUSINESS-HUB');
});

test('lists, creates, and updates managed parking lots through the shared location helper', async () => {
  const requestedUrls = [];
  const methods = [];
  const bodies = [];
  const fetcher = async (url, init = {}) => {
    requestedUrls.push(String(url));
    methods.push(init.method ?? 'GET');
    bodies.push(typeof init.body === 'string' ? init.body : null);

    if ((init.method ?? 'GET') === 'PATCH') {
      return new Response(JSON.stringify([{ id: 'lot-a', name: 'Lot A Updated', code: 'LOT-A', address: 'Address', city: 'Taguig', is_active: false }]), { status: 200 });
    }

    if ((init.method ?? 'GET') === 'POST') {
      return new Response(JSON.stringify([{ id: 'lot-a', name: 'Lot A', code: 'LOT-A', address: 'Address', city: 'Taguig', is_active: true }]), { status: 201 });
    }

    return new Response(JSON.stringify([{ id: 'lot-a', name: 'Lot A', code: 'LOT-A', address: 'Address', city: 'Taguig', is_active: true }]), { status: 200 });
  };

  const listed = await listManagedLocations({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    fetcher,
  });
  const created = await createManagedLocation({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    name: 'Lot A',
    code: 'lot a',
    address: 'Address',
    city: 'Taguig',
    isActive: true,
    fetcher,
  });
  const updated = await updateManagedLocation({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    locationId: 'lot-a',
    name: 'Lot A Updated',
    code: 'lot-a',
    address: 'Address',
    city: 'Taguig',
    isActive: false,
    fetcher,
  });

  assert.equal(requestedUrls[0].includes('/rest/v1/locations?select='), true);
  assert.equal(methods[1], 'POST');
  assert.equal(methods[2], 'PATCH');
  assert.equal((bodies[1] ?? '').includes('"code":"LOT-A"'), true);
  assert.equal((bodies[2] ?? '').includes('"is_active":false'), true);
  assert.equal(listed.length, 1);
  assert.equal(created?.code, 'LOT-A');
  assert.equal(updated?.is_active, false);
});

test('upserts dashboard role rows through the shared admin helper', async () => {
  let requestBody = '';
  const account = await upsertDashboardRoleAccount({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    userId: '00000000-0000-0000-0000-000000000001',
    role: 'operator',
    displayName: 'North Gate Operator',
    fetcher: async (_url, init = {}) => {
      requestBody = typeof init.body === 'string' ? init.body : '';
      return new Response(
        JSON.stringify([{
          user_id: '00000000-0000-0000-0000-000000000001',
          role: 'operator',
          display_name: 'North Gate Operator',
        }]),
        { status: 200 },
      );
    },
  });

  assert.equal(requestBody.includes('"role":"operator"'), true);
  assert.equal(requestBody.includes('"display_name":"North Gate Operator"'), true);
  assert.equal(account?.user_id, '00000000-0000-0000-0000-000000000001');
});

test('invites dashboard auth users through the shared admin helper', async () => {
  let invitedEmail = '';
  let inviteOptions = null;
  const invitedUser = await inviteAuthUserByEmail({
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-key',
    email: 'operator@example.com',
    displayName: 'North Gate Operator',
    redirectTo: 'https://operator.example.com/login',
    adminClient: {
      auth: {
        admin: {
          inviteUserByEmail: async (email, options = {}) => {
            invitedEmail = email;
            inviteOptions = options;
            return {
              data: {
                user: {
                  id: '00000000-0000-0000-0000-000000000002',
                  email: 'operator@example.com',
                  phone: null,
                  user_metadata: {
                    display_name: 'North Gate Operator',
                  },
                },
              },
              error: null,
            };
          },
          listUsers: async () => ({ data: { users: [] }, error: null }),
        },
      },
    },
  });

  assert.equal(invitedEmail, 'operator@example.com');
  assert.deepEqual(inviteOptions, {
    data: {
      display_name: 'North Gate Operator',
      full_name: 'North Gate Operator',
    },
    redirectTo: 'https://operator.example.com/login',
  });
  assert.equal(invitedUser.id, '00000000-0000-0000-0000-000000000002');
  assert.equal(invitedUser.displayName, 'North Gate Operator');
});
