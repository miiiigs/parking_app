import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  assert.equal(layoutRoute.includes('operatorLayoutRouteRequestSchema.safeParse'), true);
  assert.equal(slotsRoute.includes('hasOperatorCapability'), true);
  assert.equal(slotsRoute.includes('location_id'), true);
  assert.equal(slotsRoute.includes('does not belong to the active operator location'), true);
  assert.equal(slotsRoute.includes('operatorSlotUpdateRouteRequestSchema.safeParse'), true);
});

test('admin tools route keeps only reconciliation and slot reset actions in production', () => {
  const adminToolsRoute = readSource('../app/api/operator/admin-tools/route.ts');

  assert.equal(adminToolsRoute.includes('buildScopedReconciliationPlan'), true);
  assert.equal(adminToolsRoute.includes('hasOperatorCapability'), true);
  assert.equal(adminToolsRoute.includes('previewPayload'), true);
  assert.equal(adminToolsRoute.includes('impact_summary'), true);
  assert.equal(adminToolsRoute.includes('operatorAdminToolsRouteRequestSchema.safeParse'), true);
  assert.equal(adminToolsRoute.includes("event_type: 'reconciliation_completed'"), true);
  assert.equal(adminToolsRoute.includes("'reset-slots'"), true);
  assert.equal(adminToolsRoute.includes("'reset-demo'"), false);
});

test('reservations and audit pages use server-backed pagination and export paths', () => {
  const reservationsPage = readSource('../app/dashboard/reservations/page.tsx');
  const auditPage = readSource('../app/dashboard/audit/page.tsx');

  assert.equal(reservationsPage.includes('/api/operator/reservations'), true);
  assert.equal(reservationsPage.includes("'no-show'"), true);
  assert.equal(reservationsPage.includes('Page size'), true);
  assert.equal(auditPage.includes('/api/operator/audit'), true);
  assert.equal(auditPage.includes('Export'), true);
  assert.equal(auditPage.includes('Page Size'), true);
});

test('parking setup lives on its own page instead of the admin tools screen', () => {
  const adminToolsPage = readSource('../app/dashboard/admin-tools/page.tsx');
  const parkingSetupPage = readSource('../app/dashboard/parking-setup/page.tsx');
  const pricingPanel = readSource('../components/dashboard/pricing-settings-panel.tsx');

  assert.equal(adminToolsPage.includes('Parking Pricing'), false);
  assert.equal(parkingSetupPage.includes('Parking Setup'), true);
  assert.equal(parkingSetupPage.includes('PricingSettingsPanel'), true);
  assert.equal(pricingPanel.includes('/api/operator/admin-tools'), true);
  assert.equal(pricingPanel.includes('Grace Periods'), true);
});
