import test from 'node:test';
import assert from 'node:assert/strict';

import { getAdminCapabilities, hasAdminCapability } from '../lib/adminPermissions.ts';

test('admin retains all capabilities', () => {
  assert.equal(hasAdminCapability('admin', 'reset-demo-data'), true);
  assert.equal(hasAdminCapability('admin', 'edit-map-layout'), true);
  assert.equal(hasAdminCapability('admin', 'run-reconciliation'), true);
  assert.equal(getAdminCapabilities('admin').includes('view-dashboard'), true);
});

test('support and finance remain read only', () => {
  assert.equal(hasAdminCapability('support', 'edit-slot-status'), false);
  assert.equal(hasAdminCapability('finance', 'run-reconciliation'), false);
  assert.equal(getAdminCapabilities('support').includes('view-audit'), true);
  assert.equal(getAdminCapabilities('finance').includes('view-dashboard'), true);
});
