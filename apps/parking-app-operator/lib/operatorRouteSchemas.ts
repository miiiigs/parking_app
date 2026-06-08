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

export const operatorAdminToolsRouteRequestSchema = z.object({
  action: z.enum(['reconcile', 'reset-slots']),
  preview: z.boolean().optional().default(false),
});

export function formatRouteValidationIssues(issues: z.ZodIssue[]) {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.join('.'),
  }));
}
