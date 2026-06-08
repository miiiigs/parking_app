export const OPERATOR_ROLES = ['admin', 'operator', 'support', 'finance'] as const;

export type OperatorRole = (typeof OPERATOR_ROLES)[number];
