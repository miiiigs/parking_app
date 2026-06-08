import test from 'node:test';
import assert from 'node:assert/strict';

import {
  operatorAdminToolsRouteRequestSchema,
  operatorLayoutRouteRequestSchema,
  operatorSlotUpdateRouteRequestSchema,
} from '../lib/operatorRouteSchemas.ts';

test('layout route schema rejects malformed write payloads', () => {
  const result = operatorLayoutRouteRequestSchema.safeParse({
    locationId: 'loc-1',
    layout: {
      id: 'parking-lot-draft',
      name: 'Lot A',
      width: 1200,
      height: 900,
      roads: [],
      slots: [
        {
          id: 'slot-1',
          label: '',
          status: 'available',
          displayOrder: 1,
          x: 10,
          y: 20,
          rotation: 0,
        },
      ],
      nodes: [],
      arrows: [],
    },
  });

  assert.equal(result.success, false);
});

test('slot update schema rejects empty or unsupported updates', () => {
  assert.equal(
    operatorSlotUpdateRouteRequestSchema.safeParse({
      slotId: 'slot-1',
      updates: {},
    }).success,
    false,
  );

  assert.equal(
    operatorSlotUpdateRouteRequestSchema.safeParse({
      slotId: 'slot-1',
      updates: { status: 'broken' },
    }).success,
    false,
  );
});

test('admin tools schema allows only production-supported actions', () => {
  assert.equal(
    operatorAdminToolsRouteRequestSchema.safeParse({
      action: 'reset-demo',
      preview: true,
    }).success,
    false,
  );

  assert.equal(
    operatorAdminToolsRouteRequestSchema.safeParse({
      action: 'reconcile',
      preview: true,
    }).success,
    true,
  );
});
