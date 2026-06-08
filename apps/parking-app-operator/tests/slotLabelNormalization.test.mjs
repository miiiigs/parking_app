import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureUniqueSlotLabels, findDuplicateSlotLabels, renumberSlotLabels } from '../lib/operatorSlotLabeling.ts';

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

test('renumberSlotLabels assigns unique sequential labels across the full slot set', () => {
  const slots = [
    { id: 'slot-1', label: 'Slot #1', x: 0, y: 0 },
    { id: 'slot-2', label: 'Slot #20', x: 50, y: 0 },
    { id: 'slot-3', label: 'New Slot', x: 100, y: 0 },
  ];

  const renumbered = renumberSlotLabels(slots, 'Slot #', 2);

  assert.deepEqual(
    renumbered.map((slot) => slot.label),
    ['Slot #01', 'Slot #02', 'Slot #03'],
  );
  assert.deepEqual(findDuplicateSlotLabels(renumbered), []);
});

test('renumberSlotLabels still produces unique labels when duplicate slot ids are present', () => {
  const slots = [
    { id: 'slot-20', label: 'Slot #20', x: 0, y: 0 },
    { id: 'slot-20', label: 'New Slot', x: 50, y: 0 },
    { id: 'slot-21', label: 'Slot #21', x: 100, y: 0 },
  ];

  const renumbered = renumberSlotLabels(slots, 'Slot #', 2);

  assert.deepEqual(
    renumbered.map((slot) => slot.label),
    ['Slot #01', 'Slot #02', 'Slot #03'],
  );
  assert.deepEqual(findDuplicateSlotLabels(renumbered), []);
});
