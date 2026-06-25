import { z } from 'zod';

const parkingSlotStatuses = ['available', 'reserved', 'occupied', 'blocked', 'disputed'] as const;
const operatorMapNodeKinds = ['entry', 'exit', 'junction'] as const;
const operatorMapRoadKinds = ['straight', 'curve'] as const;
const operatorMapDirections = [
  'north',
  'south',
  'east',
  'west',
  'north-east',
  'north-west',
  'south-east',
  'south-west',
] as const;

const finiteNumber = z.number().finite();
const nonNegativeMoney = finiteNumber.min(0);

const parkingMapPointSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
});

const parkingMapRoadSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(operatorMapRoadKinds),
  label: z.string().trim().min(1),
  x: finiteNumber,
  y: finiteNumber,
  width: finiteNumber,
  height: finiteNumber,
  rotation: finiteNumber.optional(),
  direction: z.enum(operatorMapDirections).optional(),
  points: z.array(parkingMapPointSchema).min(2).optional(),
});

const parkingMapSlotSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  status: z.enum(parkingSlotStatuses),
  displayOrder: z.number().int(),
  x: finiteNumber,
  y: finiteNumber,
  rotation: finiteNumber,
  width: finiteNumber.optional(),
  height: finiteNumber.optional(),
});

const parkingMapNodeSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(operatorMapNodeKinds),
  label: z.string().trim().min(1),
  x: finiteNumber,
  y: finiteNumber,
  direction: z.enum(operatorMapDirections).optional(),
});

const parkingMapArrowSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  x: finiteNumber,
  y: finiteNumber,
  rotation: finiteNumber,
});

export const operatorLotLayoutSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  width: finiteNumber,
  height: finiteNumber,
  roads: z.array(parkingMapRoadSchema),
  slots: z.array(parkingMapSlotSchema),
  nodes: z.array(parkingMapNodeSchema),
  arrows: z.array(parkingMapArrowSchema),
});

export const operatorLayoutRouteRequestSchema = z.object({
  locationId: z.string().trim().min(1),
  layout: operatorLotLayoutSchema,
  applyMap: z.boolean().optional().default(false),
  previewOnly: z.boolean().optional().default(false),
  rollbackToRevisionId: z.string().trim().min(1).nullable().optional(),
});

export const operatorSlotUpdateRouteRequestSchema = z.object({
  slotId: z.string().trim().min(1),
  updates: z
    .object({
      status: z.enum([...parkingSlotStatuses, 'maintenance']).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one slot update field is required.',
    }),
});

export const operatorGateEntryRouteRequestSchema = z.object({
  entryPass: z.string().trim().min(1),
});

const uuidString = z.string().trim().uuid();
const operatorRoleSchema = z.enum(['admin', 'operator', 'support', 'finance']);
const managedLocationString = z.string().trim().min(1).max(160);

export const operatorLocationAssignmentRouteRequestSchema = z.object({
  userId: uuidString,
  locationId: uuidString,
});

export const operatorDashboardAccountProvisionRouteRequestSchema = z.object({
  email: z.string().trim().email(),
  role: operatorRoleSchema,
  displayName: z.string().trim().max(120).optional().default(''),
});

export const operatorLocationCreateRouteRequestSchema = z.object({
  name: managedLocationString,
  code: z.string().trim().min(1).max(40),
  address: managedLocationString,
  city: managedLocationString,
  isActive: z.boolean().optional().default(true),
});

export const operatorLocationUpdateRouteRequestSchema = z.object({
  locationId: uuidString,
  name: managedLocationString,
  code: z.string().trim().min(1).max(40),
  address: managedLocationString,
  city: managedLocationString,
  isActive: z.boolean(),
});

export const operatorAdminToolsRouteRequestSchema = z.object({
  action: z.enum(['reconcile', 'reset-slots', 'update-pricing']),
  preview: z.boolean().optional().default(false),
  pricingConfig: z
    .object({
      mode: z.enum(['flat_rate', 'fixed_rate', 'tiered']),
      flatRateAmount: nonNegativeMoney,
      fixedRateAmount: nonNegativeMoney,
      fixedRateIntervalMinutes: z.number().int().min(1).max(1440),
      firstPeriodMinutes: z.number().int().min(1).max(1440),
      firstPeriodRate: nonNegativeMoney,
      succeedingRateAmount: nonNegativeMoney,
      succeedingRateIntervalMinutes: z.number().int().min(1).max(1440),
      entryGraceMinutes: z.number().int().min(0).max(120),
      exitGraceMinutes: z.number().int().min(0).max(120),
    })
    .optional(),
  reservationPricingConfig: z
    .object({
      fee30Minutes: nonNegativeMoney,
      fee60Minutes: nonNegativeMoney,
      fee120Minutes: nonNegativeMoney,
    })
    .optional(),
}).superRefine((value, context) => {
  if (value.action === 'update-pricing' && (!value.pricingConfig || !value.reservationPricingConfig)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'pricingConfig and reservationPricingConfig are required for update-pricing.',
      path: ['pricingConfig'],
    });
  }
});

export function formatRouteValidationIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.join('.'),
  }));
}
