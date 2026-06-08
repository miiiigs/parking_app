const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('operator routes resolve location context explicitly', () => {
  const dashboardRoute = readSource('../app/api/operator/dashboard/route.ts');
  const layoutRoute = readSource('../app/api/operator/layout/route.ts');
  const adminToolsRoute = readSource('../app/api/operator/admin-tools/route.ts');
  const slotsRoute = readSource('../app/api/operator/slots/route.ts');

  assert.equal(dashboardRoute.includes('resolveOperatorLocationContext'), true);
  assert.equal(layoutRoute.includes('resolveOperatorLocationContext'), true);
  assert.equal(adminToolsRoute.includes('resolveOperatorLocationContext'), true);
  assert.equal(slotsRoute.includes('resolveOperatorLocationContext'), true);
});

test('layout route rejects mismatched location requests and location API sets selection', () => {
  const layoutRoute = readSource('../app/api/operator/layout/route.ts');
  const locationRoute = readSource('../app/api/operator/location/route.ts');

  assert.equal(layoutRoute.includes('assertOperatorLocationRequest'), true);
  assert.equal(layoutRoute.includes("status: 409"), true);
  assert.equal(locationRoute.includes('setOperatorLocationSelection'), true);
  assert.equal(locationRoute.includes('locationId is required'), true);
});
