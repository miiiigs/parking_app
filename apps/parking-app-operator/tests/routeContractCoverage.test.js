const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

test('dashboard route returns the typed operator payload and uses scoped event-backed reconciliation history', () => {
  const dashboardRoute = readSource('../app/api/operator/dashboard/route.ts');

  assert.equal(dashboardRoute.includes('const payload: OperatorDashboardData = {'), true);
  assert.equal(dashboardRoute.includes('const sessions: ParkingSessionRecord[] ='), true);
  assert.equal(dashboardRoute.includes('const payments: PaymentRecord[] ='), true);
  assert.equal(dashboardRoute.includes('linkedSessionId:'), true);
  assert.equal(dashboardRoute.includes("event_type === 'reconciliation_completed'"), true);
  assert.equal(dashboardRoute.includes('buildOperatorDashboardMetrics'), true);
  assert.equal(dashboardRoute.includes('systemHealth: buildServerSystemHealth'), true);
});

test('layout and slot routes enforce active-location ownership on writes', () => {
  const layoutRoute = readSource('../app/api/operator/layout/route.ts');
  const slotsRoute = readSource('../app/api/operator/slots/route.ts');

  assert.equal(layoutRoute.includes('assertOperatorLocationRequest'), true);
  assert.equal(layoutRoute.includes('resolveOperatorLocationContext'), true);
  assert.equal(layoutRoute.includes('hasOperatorCapability'), true);
  assert.equal(layoutRoute.includes('previewOnly'), true);
  assert.equal(layoutRoute.includes("eventType = rollbackToRevisionId"), true);
  assert.equal(slotsRoute.includes('hasOperatorCapability'), true);
  assert.equal(slotsRoute.includes('location_id'), true);
  assert.equal(slotsRoute.includes('does not belong to the active operator location'), true);
});

test('admin tools route uses scoped reconciliation and scoped destructive resets', () => {
  const adminToolsRoute = readSource('../app/api/operator/admin-tools/route.ts');

  assert.equal(adminToolsRoute.includes('buildScopedReconciliationPlan'), true);
  assert.equal(adminToolsRoute.includes('buildLocationScopedAdminResetTargets'), true);
  assert.equal(adminToolsRoute.includes('hasOperatorCapability'), true);
  assert.equal(adminToolsRoute.includes('previewPayload'), true);
  assert.equal(adminToolsRoute.includes('impact_summary'), true);
  assert.equal(adminToolsRoute.includes("event_type: 'reconciliation_completed'"), true);
  assert.equal(adminToolsRoute.includes("deleteRowsByIds(config.url, headers, 'reservations'"), true);
});
