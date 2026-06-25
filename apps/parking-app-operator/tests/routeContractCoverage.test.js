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

test('gate entry route is authenticated, location-scoped, and invokes the service-only confirmation rpc', () => {
  const gateEntryRoute = readSource('../app/api/operator/gate-entry/route.ts');
  const routeSchemas = readSource('../lib/operatorRouteSchemas.ts');

  assert.equal(gateEntryRoute.includes('getCurrentOperatorUser'), true);
  assert.equal(gateEntryRoute.includes("hasOperatorCapability(operatorUser.role, 'edit-slot-status')"), true);
  assert.equal(gateEntryRoute.includes('resolveOperatorLocationContext'), true);
  assert.equal(gateEntryRoute.includes('hasOperatorLocationAssignment'), true);
  assert.equal(gateEntryRoute.includes('operatorUser.id'), true);
  assert.equal(gateEntryRoute.includes('Operator is not assigned to the active parking location.'), true);
  assert.equal(gateEntryRoute.includes('/rest/v1/rpc/confirm_parking_entry'), true);
  assert.equal(gateEntryRoute.includes('p_location_id: activeLocation.id'), true);
  assert.equal(gateEntryRoute.includes("'walkin-entry-pass|'"), true);
  assert.equal(routeSchemas.includes('operatorGateEntryRouteRequestSchema'), true);
});

test('parking actions ui exposes entry verification and keeps exit verification explicitly blocked', () => {
  const layout = readSource('../components/layout/dashboard-layout.tsx');
  const parkingActionsPage = readSource('../app/dashboard/parking-actions/page.tsx');
  const detailSheet = readSource('../components/dashboard/operation-detail-sheet.tsx');
  const parkingActionControls = readSource('../components/dashboard/parking-action-controls.tsx');

  assert.equal(layout.includes("/dashboard/parking-actions"), true);
  assert.equal(layout.includes("capability: 'edit-slot-status'"), true);
  assert.equal(parkingActionsPage.includes('/api/operator/gate-entry'), true);
  assert.equal(parkingActionsPage.includes('Scan QR'), true);
  assert.equal(parkingActionsPage.includes('Verify Entry QR'), true);
  assert.equal(parkingActionsPage.includes('Verify Exit QR'), true);
  assert.equal(parkingActionsPage.includes('backend exit authorization contract exists'), true);
  assert.equal(detailSheet.includes('Parking Actions'), true);
  assert.equal(parkingActionControls.includes('Entry QR verified.'), true);
  assert.equal(parkingActionControls.includes('Verify Exit QR'), true);
});

test('access control is admin-only and manages durable operator lot assignments server-side', () => {
  const layout = readSource('../components/layout/dashboard-layout.tsx');
  const accessControlPage = readSource('../app/dashboard/access-control/page.tsx');
  const assignmentsRoute = readSource('../app/api/operator/location-assignments/route.ts');
  const dashboardAccountsRoute = readSource('../app/api/operator/dashboard-accounts/route.ts');
  const locationServer = readSource('../lib/operatorLocationServer.ts');
  const permissions = readSource('../lib/operatorPermissions.ts');
  const seedSql = readSource('../../../supabase/seed.sql');

  assert.equal(layout.includes('/dashboard/access-control'), true);
  assert.equal(layout.includes("capability: 'manage-operator-access'"), true);
  assert.equal(accessControlPage.includes('/api/operator/location-assignments'), true);
  assert.equal(accessControlPage.includes('/api/operator/dashboard-accounts'), true);
  assert.equal(accessControlPage.includes('Invite or Grant Dashboard Access'), true);
  assert.equal(accessControlPage.includes('Admin access required'), true);
  assert.equal(assignmentsRoute.includes("operatorUser?.role === 'admin'"), true);
  assert.equal(assignmentsRoute.includes('createOperatorLocationAssignment'), true);
  assert.equal(assignmentsRoute.includes('deleteOperatorLocationAssignment'), true);
  assert.equal(assignmentsRoute.includes('admin_audit_log'), true);
  assert.equal(dashboardAccountsRoute.includes("operatorUser?.role === 'admin'"), true);
  assert.equal(dashboardAccountsRoute.includes('findAuthUserByEmail'), true);
  assert.equal(dashboardAccountsRoute.includes('inviteAuthUserByEmail'), true);
  assert.equal(dashboardAccountsRoute.includes('upsertDashboardRoleAccount'), true);
  assert.equal(dashboardAccountsRoute.includes('admin_audit_log'), true);
  assert.equal(locationServer.includes("currentUser.role !== 'admin'"), true);
  assert.equal(locationServer.includes('listOperatorLocationAssignments'), true);
  assert.equal(permissions.includes("'manage-operator-access'"), true);
  assert.equal(seedSql.includes('Makati Business Hub'), true);
  assert.equal(seedSql.includes('Ortigas Center Deck'), true);
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
  const reservationsRoute = readSource('../app/api/operator/reservations/route.ts');
  const scopedQueries = readSource('../lib/operatorScopedQueries.ts');
  const detailSheet = readSource('../components/dashboard/operation-detail-sheet.tsx');
  const dashboardRoute = readSource('../app/api/operator/dashboard/route.ts');
  const operatorDataStore = readSource('../lib/operatorDataStore.ts');
  const auditPage = readSource('../app/dashboard/audit/page.tsx');

  assert.equal(reservationsPage.includes('/api/operator/reservations'), true);
  assert.equal(reservationsPage.includes("'no-show'"), true);
  assert.equal(reservationsPage.includes('Page size'), true);
  assert.equal(reservationsPage.includes("params.set('source', sourceFilter)"), true);
  assert.equal(reservationsPage.includes("reservation.source === 'walk_in' ? 'Walk-In' : 'Reservation'"), true);
  assert.equal(reservationsRoute.includes("const sourceFilter = searchParams.get('source')"), true);
  assert.equal(reservationsRoute.includes('reservation.source === sourceFilter'), true);
  assert.equal(reservationsRoute.includes('source: reservation.source'), true);
  assert.equal(scopedQueries.includes('select=id,slot_id,source,plate_number'), true);
  assert.equal(detailSheet.includes('reservation.source'), true);
  assert.equal(dashboardRoute.includes('source: reservation.source'), true);
  assert.equal(dashboardRoute.includes('select=id,slot_id,source,plate_number'), true);
  assert.equal(operatorDataStore.includes("readRecordString(record, 'source') === 'walk_in'"), true);
  assert.equal(auditPage.includes('/api/operator/audit'), true);
  assert.equal(auditPage.includes('Export'), true);
  assert.equal(auditPage.includes('Page Size'), true);
});

test('parking setup lives on its own page instead of the admin tools screen', () => {
  const adminToolsPage = readSource('../app/dashboard/admin-tools/page.tsx');
  const parkingSetupPage = readSource('../app/dashboard/parking-setup/page.tsx');
  const manageParkingLotsPage = readSource('../app/dashboard/manage-parking-lots/page.tsx');
  const dashboardLayout = readSource('../components/layout/dashboard-layout.tsx');
  const pricingPanel = readSource('../components/dashboard/pricing-settings-panel.tsx');
  const locationManagementPanel = readSource('../components/dashboard/location-management-panel.tsx');

  assert.equal(adminToolsPage.includes('Parking Pricing'), false);
  assert.equal(dashboardLayout.includes('/dashboard/manage-parking-lots'), true);
  assert.equal(dashboardLayout.includes("capability: 'manage-operator-access'"), true);
  assert.equal(manageParkingLotsPage.includes('Manage Parking Lots'), true);
  assert.equal(manageParkingLotsPage.includes('LocationManagementPanel'), true);
  assert.equal(parkingSetupPage.includes('Parking Setup'), true);
  assert.equal(parkingSetupPage.includes('Manage Parking Lots'), true);
  assert.equal(parkingSetupPage.includes('PricingSettingsPanel'), true);
  assert.equal(parkingSetupPage.includes('LocationManagementPanel'), false);
  assert.equal(parkingSetupPage.includes('Selected dashboard lot'), true);
  assert.equal(pricingPanel.includes('/api/operator/admin-tools'), true);
  assert.equal(pricingPanel.includes('Grace Periods'), true);
  assert.equal(locationManagementPanel.includes('/api/operator/locations'), true);
  assert.equal(locationManagementPanel.includes('Create Parking Lot'), true);
  assert.equal(locationManagementPanel.includes('Edit Managed Parking Lot'), true);
  assert.equal(locationManagementPanel.includes('Save selected lot'), true);
  assert.equal(locationManagementPanel.includes('/dashboard/parking-setup'), true);
});
