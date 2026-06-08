import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScopedReconciliationPlan } from '../lib/operatorReconciliation.ts';

test('builds a scoped reconciliation plan only for mismatched slots in the active location', () => {
  const plan = buildScopedReconciliationPlan({
    slotRows: [
      { id: 'slot-1', slot_label: 'S01', status: 'available' },
      { id: 'slot-2', slot_label: 'S02', status: 'available' },
      { id: 'slot-3', slot_label: 'S03', status: 'blocked' },
    ],
    reservationRows: [
      { slot_id: 'slot-1', status: 'confirmed' },
    ],
    sessionRows: [
      { slot_id: 'slot-2', status: 'active' },
    ],
  });

  assert.equal(plan.mismatchCount, 2);
  assert.equal(plan.fixedCount, 2);
  assert.deepEqual(plan.fixes, [
    {
      slot_id: 'slot-1',
      slot_label: 'S01',
      previous_status: 'available',
      fixed_status: 'reserved',
      reason: 'confirmed reservation',
    },
    {
      slot_id: 'slot-2',
      slot_label: 'S02',
      previous_status: 'available',
      fixed_status: 'occupied',
      reason: 'active session',
    },
  ]);
});
