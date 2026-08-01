import test from 'node:test';
import assert from 'node:assert/strict';

import { getOperatorCapabilities, hasOperatorCapability } from '../lib/operatorPermissions.ts';

test('admin has full operator capability set', () => {
  const capabilities = getOperatorCapabilities('admin');
  assert.equal(hasOperatorCapability('admin', 'edit-map-layout'), true);
  assert.equal(hasOperatorCapability('admin', 'manage-operator-access'), true);
  assert.equal(capabilities.includes('view-dashboard'), true);
  assert.equal(capabilities.includes('view-audit'), true);
});

test('operator can operate assigned lots and reach reconciliation without regaining admin-only controls', () => {
  assert.equal(hasOperatorCapability('operator', 'edit-slot-status'), true);
  assert.equal(hasOperatorCapability('operator', 'run-reconciliation'), true);
  assert.equal(hasOperatorCapability('operator', 'manage-operator-access'), false);
  assert.equal(hasOperatorCapability('operator', 'manage-pricing'), false);
  assert.equal(hasOperatorCapability('operator', 'reset-slot-statuses'), false);
});

test('support and finance are read-only', () => {
  assert.equal(hasOperatorCapability('support', 'edit-slot-status'), false);
  assert.equal(hasOperatorCapability('finance', 'run-reconciliation'), false);
  assert.deepEqual(getOperatorCapabilities('support').includes('view-audit'), true);
  assert.deepEqual(getOperatorCapabilities('finance').includes('view-reservations'), true);
});
