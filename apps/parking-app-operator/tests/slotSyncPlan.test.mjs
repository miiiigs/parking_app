import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSlotInventorySyncPlan, buildTemporarySlotLabel } from '../lib/operatorSlotSyncPlan.ts';

test('uses display order to update a renamed slot instead of planning a duplicate insert', () => {
  const plan = buildSlotInventorySyncPlan(
    [
      { id: 'draft-a', label: 'S01', status: 'available', x: 0, y: 0 },
      { id: 'draft-b', label: 'S02', status: 'available', x: 40, y: 0 },
    ],
    [
      { id: 'live-a', label: 'Slot #1', status: 'available', displayOrder: 1 },
      { id: 'live-b', label: 'Slot #2', status: 'available', displayOrder: 2 },
    ],
    'location-1',
  );

  assert.equal(plan.inserts.length, 0);
  assert.deepEqual(
    plan.updates.map((update) => ({
      id: update.id,
      slot_label: update.slot_label,
      display_order: update.display_order,
    })),
    [
      { id: 'live-a', slot_label: 'S01', display_order: 1 },
      { id: 'live-b', slot_label: 'S02', display_order: 2 },
    ],
  );
});

test('plans temporary relabels when an updated slot reuses a removed slot label', () => {
  const plan = buildSlotInventorySyncPlan(
    [
      { id: 'slot-b', label: 'Slot #18', status: 'available', x: 0, y: 0 },
    ],
    [
      { id: 'slot-a', label: 'Slot #18', status: 'available', displayOrder: 1 },
      { id: 'slot-b', label: 'Slot #19', status: 'available', displayOrder: 2 },
    ],
    'location-1',
  );

  assert.deepEqual(
    plan.updates,
    [
      {
        id: 'slot-b',
        currentLabel: 'Slot #19',
        slot_label: 'Slot #18',
        display_order: 1,
      },
    ],
  );
  assert.deepEqual(
    plan.removedLiveSlots.map((slot) => slot.id),
    ['slot-a'],
  );
  assert.deepEqual(
    plan.temporaryRelabels,
    [
      { id: 'slot-b', slot_label: buildTemporarySlotLabel('slot-b') },
      { id: 'slot-a', slot_label: buildTemporarySlotLabel('slot-a') },
    ],
  );
});

test('keeps existing live ids matched first so a new draft slot cannot steal an old slot label match', () => {
  const plan = buildSlotInventorySyncPlan(
    [
      { id: 'live-1', label: 'Slot #1', status: 'available', x: 0, y: 0 },
      { id: 'live-20', label: 'Slot #21', status: 'available', x: 80, y: 0 },
      { id: 'draft-new', label: 'Slot #20', status: 'available', x: 40, y: 0 },
    ],
    [
      { id: 'live-1', label: 'Slot #1', status: 'available', displayOrder: 1 },
      { id: 'live-20', label: 'Slot #20', status: 'available', displayOrder: 2 },
    ],
    'location-1',
  );

  assert.deepEqual(
    plan.updates,
    [
      {
        id: 'live-20',
        currentLabel: 'Slot #20',
        slot_label: 'Slot #21',
        display_order: 2,
      },
    ],
  );
  assert.deepEqual(
    plan.inserts,
    [
      {
        location_id: 'location-1',
        slot_label: 'Slot #20',
        display_order: 3,
        status: 'available',
      },
    ],
  );
  assert.equal(plan.temporaryRelabels.some((entry) => entry.id === 'live-20'), true);
});
