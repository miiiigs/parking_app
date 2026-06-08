const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('middleware enforces route capabilities and admin roles', () => {
  const middleware = readSource('../middleware.ts');

  assert.equal(middleware.includes('getRouteCapability'), true);
  assert.equal(middleware.includes('hasAdminCapability'), true);
  assert.equal(middleware.includes('ADMIN_ROLES'), true);
});

test('location API and dashboard state use explicit location selection', () => {
  const locationRoute = readSource('../app/api/admin/location/route.ts');
  const layoutState = readSource('../lib/parkingLotLayout.ts');
  const dashboard = readSource('../lib/dashboard.ts');

  assert.equal(locationRoute.includes('setAdminLocationSelection'), true);
  assert.equal(locationRoute.includes('resolveAdminLocationContext'), true);
  assert.equal(layoutState.includes('fetchLotBuilderPersistedState(locationId'), true);
  assert.equal(dashboard.includes('resolveAdminLocationContext'), true);
  assert.equal(dashboard.includes('slotIdFilter'), true);
});

test('dashboard page hides privileged actions behind capability checks', () => {
  const page = readSource('../app/page.tsx');

  assert.equal(page.includes('hasAdminCapability'), true);
  assert.equal(page.includes('canResetDemo'), true);
  assert.equal(page.includes('canRunReconciliation'), true);
  assert.equal(page.includes('canEditSlotStatus'), true);
});
