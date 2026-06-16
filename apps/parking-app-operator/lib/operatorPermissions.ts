import type { OperatorRole } from './adminAuth';

export type OperatorCapability =
  | 'view-dashboard'
  | 'view-reservations'
  | 'view-audit'
  | 'view-parking-map'
  | 'edit-slot-status'
  | 'edit-map-layout'
  | 'manage-pricing'
  | 'run-reconciliation'
  | 'reset-slot-statuses';

const ROLE_CAPABILITIES: Record<OperatorRole, OperatorCapability[]> = {
  admin: [
    'view-dashboard',
    'view-reservations',
    'view-audit',
    'view-parking-map',
    'edit-slot-status',
    'edit-map-layout',
    'manage-pricing',
    'run-reconciliation',
    'reset-slot-statuses',
  ],
  operator: [
    'view-dashboard',
    'view-reservations',
    'view-audit',
    'view-parking-map',
    'edit-slot-status',
    'edit-map-layout',
    'manage-pricing',
    'run-reconciliation',
    'reset-slot-statuses',
  ],
  support: ['view-dashboard', 'view-reservations', 'view-audit', 'view-parking-map'],
  finance: ['view-dashboard', 'view-reservations', 'view-audit'],
};

export function hasOperatorCapability(role: OperatorRole | null | undefined, capability: OperatorCapability) {
  if (!role) {
    return false;
  }

  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function getOperatorCapabilities(role: OperatorRole | null | undefined): OperatorCapability[] {
  if (!role) {
    return [];
  }

  return ROLE_CAPABILITIES[role] ?? [];
}

export function canOperateLocation(role: OperatorRole | null | undefined) {
  return hasOperatorCapability(role, 'edit-map-layout') || hasOperatorCapability(role, 'edit-slot-status');
}
