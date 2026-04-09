export const ADMIN_ROLES = ['admin', 'operator', 'support', 'finance'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
