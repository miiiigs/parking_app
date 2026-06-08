import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureUniqueSlotLabels } from '../lib/operatorSlotLabeling.ts';

test('keeps already unique slot labels unchanged', () => {
  const slots = [
    { id: 'slot-1', label: 'S01', x: 0, y: 0 },
    { id: 'slot-2', label: 'S02', x: 40, y: 0 },
  ];

  assert.deepEqual(ensureUniqueSlotLabels(slots), slots);
});

test('normalizes duplicate and blank labels using the dominant prefix in map order', () => {
  const slots = [
    { id: 'slot-3', label: '', x: 100, y: 100 },
    { id: 'slot-1', label: 'Slot #1', x: 0, y: 0 },
    { id: 'slot-2', label: 'Slot #1', x: 50, y: 0 },
  ];

  const normalized = ensureUniqueSlotLabels(slots);

  assert.deepEqual(
    normalized.map((slot) => ({ id: slot.id, label: slot.label })),
    [
      { id: 'slot-3', label: 'Slot #03' },
      { id: 'slot-1', label: 'Slot #01' },
      { id: 'slot-2', label: 'Slot #02' },
    ],
  );
});
