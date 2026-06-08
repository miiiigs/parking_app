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
