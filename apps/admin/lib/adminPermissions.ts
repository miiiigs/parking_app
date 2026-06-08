import type { AdminRole } from './adminAuth';

export type AdminCapability =
  | 'view-dashboard'
  | 'view-reservations'
  | 'view-audit'
  | 'view-parking-map'
  | 'edit-slot-status'
  | 'edit-map-layout'
  | 'run-reconciliation'
  | 'reset-slot-statuses'
  | 'reset-demo-data';

const ROLE_CAPABILITIES: Record<AdminRole, AdminCapability[]> = {
  admin: [
    'view-dashboard',
    'view-reservations',
    'view-audit',
    'view-parking-map',
    'edit-slot-status',
    'edit-map-layout',
    'run-reconciliation',
    'reset-slot-statuses',
    'reset-demo-data',
  ],
  operator: [
    'view-dashboard',
    'view-reservations',
    'view-audit',
    'view-parking-map',
    'edit-slot-status',
    'edit-map-layout',
    'run-reconciliation',
    'reset-slot-statuses',
  ],
  support: ['view-dashboard', 'view-reservations', 'view-audit', 'view-parking-map'],
  finance: ['view-dashboard', 'view-reservations', 'view-audit'],
};

export function hasAdminCapability(role: AdminRole | null | undefined, capability: AdminCapability) {
  if (!role) {
    return false;
  }

  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function getAdminCapabilities(role: AdminRole | null | undefined): AdminCapability[] {
  if (!role) {
    return [];
  }

  return ROLE_CAPABILITIES[role] ?? [];
}

export function getRouteCapability(pathname: string): AdminCapability | null {
  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    if (pathname.includes('/audit')) return 'view-audit';
    if (pathname.includes('/reservations')) return 'view-reservations';
    return 'view-dashboard';
  }

  if (pathname.startsWith('/lot-builder')) {
    return 'edit-map-layout';
  }

  if (pathname.startsWith('/parking-map')) {
    return 'view-parking-map';
  }

  if (pathname.startsWith('/qr')) {
    return 'view-parking-map';
  }

  return null;
}
