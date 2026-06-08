"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Minus,
  Move,
  ParkingSquare,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import {
  buildRoadShape,
  createEmptyParkingLotDefinition,
  type ParkingLotDefinition,
  type ParkingMapArrowDirection,
  type ParkingMapNodeKind,
  type ParkingMapPoint,
  type ParkingMapRoad,
  type ParkingSlotStatus,
} from '@/lib/parkingMap';
import {
  collectRoadEndpointTargets,
  connectRoadEndpointToNearest,
  extendStraightRoadEnd,
  getRoadBounds,
  moveRoadToOrigin,
  snapPoint,
  setRoadPoint,
  syncRoadFromPoints,
} from '@/lib/lotBuilderRoad';
import { recordOperatorActionFailure, recordOperatorActionSuccess, refreshOperatorData } from '@/lib/operatorDataStore';
import {
  ensureUniqueSlotLabels,
  findDuplicateSlotLabels,
  formatSlotLabel,
  parseSlotLabel,
  pickCanonicalSlotPrefix,
  renumberSlotLabels,
} from '@/lib/operatorSlotLabeling';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import { lotDefinitionToDraftItems } from '@/lib/parkingLotLayout';
import type { LayoutApplyImpactSummary, LayoutObjectSummary, LayoutRevisionRecord } from '@/lib/operatorLayoutSafety';
import { useAuth } from '@/lib/auth-context';

type PaletteItemType = 'slot' | 'road-straight' | 'road-curve' | 'entry' | 'exit' | 'junction' | 'arrow';

type DraftItem =
  | { id: string; type: 'slot'; label: string; status: ParkingSlotStatus; x: number; y: number; rotation: number; width: number; height: number }
  | {
      id: string;
      type: 'road';
      roadKind: 'straight' | 'curve';
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      points: ParkingMapPoint[];
    }
  | { id: string; type: Extract<ParkingMapNodeKind, 'entry' | 'exit' | 'junction'>; label: string; x: number; y: number; rotation: number; direction: ParkingMapArrowDirection }
  | { id: string; type: 'arrow'; label: string; x: number; y: number; rotation: number };

type RoadDraftItem = Extract<DraftItem, { type: 'road' }>;

type CanvasDrag =
  | { mode: 'move-item'; itemId: string; pointerStart: ParkingMapPoint; originX: number; originY: number }
  | { mode: 'road-move'; roadId: string; pointerStart: ParkingMapPoint; originPoints: ParkingMapPoint[] }
  | { mode: 'road-point'; roadId: string; pointIndex: number }
  | { mode: 'rotate-item'; itemId: string; center: ParkingMapPoint; originRotation: number }
  | { mode: 'road-width'; roadId: string; center: ParkingMapPoint; normal: ParkingMapPoint; originHeight: number }
  | { mode: 'slot-size'; itemId: string; center: ParkingMapPoint; rotation: number };

type SelectionMarquee = {
  start: ParkingMapPoint;
  current: ParkingMapPoint;
};

type LayoutPreview = {
  locationId: string;
  locationName: string;
  layoutSummary: LayoutObjectSummary;
  impactSummary: LayoutApplyImpactSummary | null;
};

type PendingLayoutAction =
  | { kind: 'apply'; title: string; description: string; sourceLayout: ParkingLotDefinition; rollbackToRevisionId?: string | null; preview: LayoutPreview }
  | { kind: 'rollback'; title: string; description: string; sourceLayout: ParkingLotDefinition; rollbackToRevisionId: string; preview: LayoutPreview };

const GRID_MIN = 12;
const GRID_MAX = 40;
const CANVAS_MIN_WIDTH = 1800;
const CANVAS_MIN_HEIGHT = 1200;
const SLOT_WIDTH = 64;
const SLOT_HEIGHT = 124;
const MIN_SLOT_WIDTH = 44;
const MIN_SLOT_HEIGHT = 80;
const NODE_FALLBACK_WIDTH = 152;
const NODE_FALLBACK_HEIGHT = 40;
const STRAIGHT_ROAD_AXIS_LOCK_DEGREES = 4;
const DIRECTION_OPTIONS: ParkingMapArrowDirection[] = [
  'north',
  'south',
  'east',
  'west',
  'north-east',
  'north-west',
  'south-east',
  'south-west',
];

const palette: Array<{
  type: PaletteItemType;
  label: string;
  description: string;
  icon: typeof ParkingSquare;
}> = [
  { type: 'slot', label: 'Parking Slot', description: 'Standard parking bay', icon: ParkingSquare },
  { type: 'road-straight', label: 'Straight Road', description: 'Drive lane segment', icon: Move },
  { type: 'road-curve', label: 'Curved Road', description: 'Turn or loop connector', icon: Waypoints },
  { type: 'entry', label: 'Entry Gate', description: 'Vehicle entry point', icon: LogIn },
  { type: 'exit', label: 'Exit Gate', description: 'Vehicle exit point', icon: LogOut },
  { type: 'junction', label: 'Custom Access', description: 'Mall entrance, elevator, ramp', icon: MapPin },
  { type: 'arrow', label: 'Direction Arrow', description: 'Traffic guidance marker', icon: ArrowRight },
];

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function removeRoadPoint(points: ParkingMapPoint[], pointIndex: number) {
  if (points.length <= 2) {
    return points;
  }

  return points.filter((_, index) => index !== pointIndex);
}

function isRoadDraftItem(item: DraftItem): item is RoadDraftItem {
  return item.type === 'road';
}

function createDraftItem(type: PaletteItemType, x: number, y: number): DraftItem {
  if (type === 'slot') {
    return {
      id: nextId('slot'),
      type: 'slot',
      label: 'New Slot',
      status: 'available',
      x,
      y,
      rotation: 0,
      width: SLOT_WIDTH,
      height: SLOT_HEIGHT,
    };
  }

  if (type === 'road-straight') {
    const road: RoadDraftItem = {
      id: nextId('road'),
      type: 'road',
      roadKind: 'straight',
      label: 'Driveway',
      x,
      y,
      width: 320,
      height: 64,
      rotation: 0,
      points: [
        { x, y },
        { x: x + 320, y },
      ],
    };

    return syncRoadFromPoints(road);
  }

  if (type === 'road-curve') {
    const road: RoadDraftItem = {
      id: nextId('road'),
      type: 'road',
      roadKind: 'curve',
      label: 'Curved Drive',
      x,
      y,
      width: 360,
      height: 220,
      rotation: 0,
      points: [
        { x, y: y + 90 },
        { x: x + 100, y: y + 24 },
        { x: x + 220, y: y + 144 },
        { x: x + 360, y: y + 92 },
      ],
    };

    return syncRoadFromPoints(road);
  }

  if (type === 'entry') {
    return {
      id: nextId('entry'),
      type: 'entry',
      label: 'Entry Gate',
      x,
      y,
      rotation: 0,
      direction: 'east',
    };
  }

  if (type === 'exit') {
    return {
      id: nextId('exit'),
      type: 'exit',
      label: 'Exit Gate',
      x,
      y,
      rotation: 0,
      direction: 'west',
    };
  }

  if (type === 'junction') {
    return {
      id: nextId('junction'),
      type: 'junction',
      label: 'Custom Access',
      x,
      y,
      rotation: 0,
      direction: 'north',
    };
  }

  return {
    id: nextId('arrow'),
    type: 'arrow',
    label: 'One Way',
    x,
    y,
    rotation: 0,
  };
}

function getRoadStroke(roadKind: 'straight' | 'curve') {
  return roadKind === 'curve' ? '#60a5fa' : '#3b82f6';
}

function getSlotColors(status: ParkingSlotStatus) {
  switch (status) {
    case 'reserved':
      return 'border-blue-400/60 bg-blue-500/15 text-blue-100';
    case 'occupied':
      return 'border-amber-400/60 bg-amber-500/15 text-amber-100';
    case 'blocked':
    case 'disputed':
      return 'border-red-400/60 bg-red-500/15 text-red-100';
    default:
      return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  }
}

function ensureUniqueDraftItemIds(items: DraftItem[]) {
  const seen = new Set<string>();
  let changed = false;

  const nextItems = items.map((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      return item;
    }

    changed = true;
    const prefix =
      item.type === 'slot'
        ? 'slot'
        : item.type === 'road'
          ? 'road'
          : item.type === 'arrow'
            ? 'arrow'
            : item.type;
    let nextIdValue = nextId(prefix);
    while (seen.has(nextIdValue)) {
      nextIdValue = nextId(prefix);
    }
    seen.add(nextIdValue);
    return {
      ...item,
      id: nextIdValue,
    } as DraftItem;
  });

  return { items: nextItems, changed };
}

function getSlotStatusDisplay(status: ParkingSlotStatus) {
  switch (status) {
    case 'blocked':
    case 'disputed':
      return 'Blocked';
    case 'occupied':
      return 'Occupied';
    case 'reserved':
      return 'Reserved';
    default:
      return 'Available';
  }
}

function getSlotLabelFontSize(width: number, label: string) {
  const availableWidth = Math.max(40, width - 18);
  return Math.max(10, Math.min(12, Math.floor((availableWidth / Math.max(label.length, 1)) * 1.75)));
}

function getSlotStatusFontSize(width: number, label: string) {
  const availableWidth = Math.max(40, width - 18);
  return Math.max(8, Math.min(10, Math.floor((availableWidth / Math.max(label.length, 1)) * 1.55)));
}

function getNodeColors(type: Extract<ParkingMapNodeKind, 'entry' | 'exit' | 'junction'>) {
  if (type === 'entry') {
    return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100';
  }
  if (type === 'exit') {
    return 'border-red-400/50 bg-red-500/15 text-red-100';
  }
  return 'border-violet-400/50 bg-violet-500/15 text-violet-100';
}

function getDraftNodeCenter(item: Extract<DraftItem, { type: 'entry' | 'exit' | 'junction' }>) {
  return {
    x: item.x + NODE_FALLBACK_WIDTH / 2,
    y: item.y + NODE_FALLBACK_HEIGHT / 2,
  };
}

function moveNodeTopLeftToCenter(item: Extract<DraftItem, { type: 'entry' | 'exit' | 'junction' }>, center: ParkingMapPoint) {
  return {
    x: center.x - NODE_FALLBACK_WIDTH / 2,
    y: center.y - NODE_FALLBACK_HEIGHT / 2,
  };
}

function rotatePointAround(point: ParkingMapPoint, center: ParkingMapPoint, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180;
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;

  return {
    x: center.x + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: center.y + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };
}

function toLocalPoint(point: ParkingMapPoint, center: ParkingMapPoint, angleDegrees: number) {
  const radians = (-angleDegrees * Math.PI) / 180;
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;

  return {
    x: offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };
}

function getSlotVisualOffset(slot: Extract<DraftItem, { type: 'slot' }>) {
  if (slot.rotation === 0) {
    return { x: 0, y: 0 };
  }

  const center = {
    x: slot.x + slot.width / 2,
    y: slot.y + slot.height / 2,
  };
  const roadFacingAnchor =
    slot.rotation < 0
      ? { x: slot.x + slot.width, y: slot.y + slot.height / 2 }
      : slot.rotation > 0
        ? { x: slot.x, y: slot.y + slot.height / 2 }
        : center;
  const rotatedAnchor = rotatePointAround(roadFacingAnchor, center, slot.rotation);

  return {
    x: roadFacingAnchor.x - rotatedAnchor.x,
    y: roadFacingAnchor.y - rotatedAnchor.y,
  };
}

function getRenderedSlotFrame(slot: Extract<DraftItem, { type: 'slot' }>) {
  const offset = getSlotVisualOffset(slot);
  const x = slot.x + offset.x;
  const y = slot.y + offset.y;

  return {
    x,
    y,
    center: {
      x: x + slot.width / 2,
      y: y + slot.height / 2,
    },
  };
}

function scaleRoadPointsOnAxis(
  points: ParkingMapPoint[],
  nextSize: number,
  axis: 'x' | 'y',
) {
  if (points.length < 2) {
    return points;
  }

  const bounds = getRoadBounds(points);
  const min = axis === 'x' ? bounds.minX : bounds.minY;
  const currentSize = Math.max(1, axis === 'x' ? bounds.maxX - bounds.minX : bounds.maxY - bounds.minY);
  const scale = nextSize / currentSize;

  return points.map((point) => ({
    ...point,
    [axis]: min + ((axis === 'x' ? point.x : point.y) - min) * scale,
  }));
}

function sampleRoadCurvePoints(points: ParkingMapPoint[]) {
  if (points.length < 2) {
    return points;
  }

  if (points.length === 2) {
    const [start, end] = points;
    const samples: ParkingMapPoint[] = [];
    const steps = Math.max(3, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 24));

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      samples.push({
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      });
    }

    return samples;
  }

  const samples: ParkingMapPoint[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = index === 0 ? points[0] : points[index - 1];
    const start = points[index];
    const end = points[index + 1];
    const next = index + 2 < points.length ? points[index + 2] : points[index + 1];
    const control1 = {
      x: start.x + (end.x - previous.x) / 6,
      y: start.y + (end.y - previous.y) / 6,
    };
    const control2 = {
      x: end.x - (next.x - start.x) / 6,
      y: end.y - (next.y - start.y) / 6,
    };
    const approxLength =
      Math.hypot(control1.x - start.x, control1.y - start.y) +
      Math.hypot(control2.x - control1.x, control2.y - control1.y) +
      Math.hypot(end.x - control2.x, end.y - control2.y);
    const steps = Math.max(6, Math.ceil(approxLength / 22));

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const oneMinusT = 1 - t;
      samples.push({
        x:
          oneMinusT ** 3 * start.x +
          3 * oneMinusT ** 2 * t * control1.x +
          3 * oneMinusT * t ** 2 * control2.x +
          t ** 3 * end.x,
        y:
          oneMinusT ** 3 * start.y +
          3 * oneMinusT ** 2 * t * control1.y +
          3 * oneMinusT * t ** 2 * control2.y +
          t ** 3 * end.y,
      });
    }
  }

  return samples;
}

function normalizeRoadStrokeWidth(width: number) {
  const normalized = Math.max(48, Math.round(width));
  return normalized % 2 === 0 ? normalized : normalized + 1;
}

function normalizeDegrees(angleDegrees: number) {
  let normalized = angleDegrees % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return normalized;
}

function lockStraightRoadAngle(angleDegrees: number) {
  const normalized = normalizeDegrees(angleDegrees);
  const cardinalAngles = [-180, -90, 0, 90, 180];

  for (const candidate of cardinalAngles) {
    if (Math.abs(normalized - candidate) <= STRAIGHT_ROAD_AXIS_LOCK_DEGREES) {
      return candidate === 180 ? -180 : candidate;
    }
  }

  return normalized;
}

function buildStraightRoadPointsFromAngle(points: ParkingMapPoint[], targetAngleDegrees: number) {
  if (points.length < 2) {
    return points;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const center = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const halfLength = Math.max(40, Math.hypot(end.x - start.x, end.y - start.y) / 2);
  const lockedAngle = lockStraightRoadAngle(targetAngleDegrees);
  const radians = (lockedAngle * Math.PI) / 180;
  let unitX = Math.cos(radians);
  let unitY = Math.sin(radians);

  if (Math.abs(unitX) < 1e-10) unitX = 0;
  if (Math.abs(unitY) < 1e-10) unitY = 0;

  return [
    {
      x: center.x - unitX * halfLength,
      y: center.y - unitY * halfLength,
    },
    {
      x: center.x + unitX * halfLength,
      y: center.y + unitY * halfLength,
    },
  ];
}

function rotateRoadPoints(points: ParkingMapPoint[], angleDegrees: number) {
  if (points.length < 2 || angleDegrees === 0) {
    return points;
  }

  const bounds = getRoadBounds(points);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const radians = (angleDegrees * Math.PI) / 180;

  return points.map((point) => {
    const offsetX = point.x - centerX;
    const offsetY = point.y - centerY;

    return {
      x: centerX + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
      y: centerY + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
    };
  });
}

type DeferredNumberInputProps = {
  value: number;
  onCommit: (value: number) => void;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
};

function DeferredNumberInput({
  value,
  onCommit,
  className,
  inputMode = 'decimal',
}: DeferredNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [isEditing, value]);

  function reset() {
    setDraft(String(value));
    setIsEditing(false);
  }

  function commit() {
    const normalized = draft.trim();

    if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
      reset();
      return;
    }

    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      reset();
      return;
    }

    onCommit(parsed);
    setDraft(String(parsed));
    setIsEditing(false);
  }

  return (
    <Input
      type="text"
      inputMode={inputMode}
      value={draft}
      onFocus={() => setIsEditing(true)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          reset();
          event.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
}

export default function MapBuilderPage() {
  const { user } = useAuth();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panRef = useRef({ x: 120, y: 120 });
  const zoomRef = useRef(0.8);
  const dragRef = useRef<CanvasDrag | null>(null);

  const [lotName, setLotName] = useState('Parking Lot');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 120, y: 120 });
  const [zoom, setZoom] = useState(0.8);
  const [gridSize, setGridSize] = useState(20);
  const [canvasDrag, setCanvasDrag] = useState<CanvasDrag | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionMarquee, setSelectionMarquee] = useState<SelectionMarquee | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [lastAppliedRevision, setLastAppliedRevision] = useState<LayoutRevisionRecord | null>(null);
  const [recentRevisions, setRecentRevisions] = useState<LayoutRevisionRecord[]>([]);
  const [pendingLayoutAction, setPendingLayoutAction] = useState<PendingLayoutAction | null>(null);
  const [defaultSlotWidth, setDefaultSlotWidth] = useState(SLOT_WIDTH);
  const [defaultSlotHeight, setDefaultSlotHeight] = useState(SLOT_HEIGHT);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [rowCountDraft, setRowCountDraft] = useState('6');
  const [rowSpacingDraft, setRowSpacingDraft] = useState('24');
  const [autoNumberPrefix, setAutoNumberPrefix] = useState('S');
  const canEditLayout = hasOperatorCapability(user?.role, 'edit-map-layout');

  const panStartRef = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0 });

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    dragRef.current = canvasDrag;
  }, [canvasDrag]);

  function setPanState(next: { x: number; y: number }) {
    panRef.current = next;
    setPan(next);
  }

  function setZoomState(next: number) {
    const clamped = Math.min(1.8, Math.max(0.4, next));
    zoomRef.current = clamped;
    setZoom(clamped);
  }

  function snapValue(value: number) {
    return Math.max(0, Math.round(value / gridSize) * gridSize);
  }

  function snapPointToGrid(point: ParkingMapPoint) {
    return {
      x: snapValue(point.x),
      y: snapValue(point.y),
    };
  }

  function screenToLot(clientX: number, clientY: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { x: 0, y: 0 };
    }

    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    };
  }

  function zoomAt(clientX: number, clientY: number, nextZoom: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoomState(nextZoom);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const lotX = (screenX - panRef.current.x) / zoomRef.current;
    const lotY = (screenY - panRef.current.y) / zoomRef.current;
    const clamped = Math.min(1.8, Math.max(0.4, nextZoom));

    setZoomState(clamped);
    setPanState({
      x: screenX - lotX * clamped,
      y: screenY - lotY * clamped,
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      zoomAt(event.clientX, event.clientY, zoomRef.current + (event.deltaY < 0 ? 0.08 : -0.08));
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  function isSelected(id: string) {
    return selectedIds.includes(id);
  }

  function selectItem(id: string, additive = false) {
    setSelectedId(id);
    setMobileInspectorOpen(true);

    if (!additive) {
      setSelectedIds([id]);
      return;
    }

    setSelectedIds((current) => {
      const base = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      return base.length === 0 ? [id] : base;
    });
  }

  function clearSelection() {
    setSelectedId(null);
    setSelectedIds([]);
    setMobileInspectorOpen(false);
  }

  function getItemBox(item: DraftItem) {
    if (item.type === 'road') {
      const bounds = getRoadBounds(item.points);
      return {
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      };
    }

    if (item.type === 'slot') {
      const frame = getRenderedSlotFrame(item);
      return {
        x: frame.x,
        y: frame.y,
        width: item.width,
        height: item.height,
      };
    }

    if (item.type === 'arrow') {
      return {
        x: item.x,
        y: item.y,
        width: 112,
        height: 40,
      };
    }

    return {
      x: item.x,
      y: item.y,
      width: NODE_FALLBACK_WIDTH,
      height: NODE_FALLBACK_HEIGHT,
    };
  }

  const roadItems = useMemo(
    () => items.filter((item): item is Extract<DraftItem, { type: 'road' }> => item.type === 'road'),
    [items],
  );

  const lotBounds = useMemo(() => {
    let maxX = CANVAS_MIN_WIDTH;
    let maxY = CANVAS_MIN_HEIGHT;

    for (const item of items) {
      if (item.type === 'slot') {
        const frame = getRenderedSlotFrame(item);
        maxX = Math.max(maxX, frame.x + item.width + 84);
        maxY = Math.max(maxY, frame.y + item.height + 84);
        continue;
      }

      if (item.type === 'road') {
        const bounds = getRoadBounds(item.points);
        maxX = Math.max(maxX, bounds.maxX + 220);
        maxY = Math.max(maxY, bounds.maxY + 220);
        continue;
      }

      maxX = Math.max(maxX, item.x + 220);
      maxY = Math.max(maxY, item.y + 180);
    }

    return { width: Math.round(maxX), height: Math.round(maxY) };
  }, [items]);

  const lot = useMemo<ParkingLotDefinition>(() => {
    const base = createEmptyParkingLotDefinition(lotName);

    return {
      ...base,
      name: lotName,
      width: lotBounds.width,
      height: lotBounds.height,
      roads: items
        .filter((item): item is Extract<DraftItem, { type: 'road' }> => item.type === 'road')
        .map((item) => ({
          id: item.id,
          kind: item.roadKind,
          label: item.label,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
          direction: 'east',
          points: item.points,
        })),
      slots: items
        .filter((item): item is Extract<DraftItem, { type: 'slot' }> => item.type === 'slot')
        .map((item, index) => ({
          id: item.id,
          label: item.label,
          status: item.status,
          displayOrder: index + 1,
          x: item.x,
          y: item.y,
          rotation: item.rotation,
          width: item.width,
          height: item.height,
        })),
      nodes: items
        .filter(
          (item): item is Extract<DraftItem, { type: 'entry' | 'exit' | 'junction' }> =>
            item.type === 'entry' || item.type === 'exit' || item.type === 'junction',
        )
        .map((item) => ({
          id: item.id,
          kind: item.type,
          label: item.label,
          x: item.x,
          y: item.y,
          direction: item.direction,
        })),
      arrows: items
        .filter((item): item is Extract<DraftItem, { type: 'arrow' }> => item.type === 'arrow')
        .map((item) => ({
          id: item.id,
          label: item.label,
          x: item.x,
          y: item.y,
          rotation: item.rotation,
        })),
    };
  }, [items, lotBounds.height, lotBounds.width, lotName]);

  const hasUnappliedDraftChanges = useMemo(() => {
    if (!lastAppliedRevision?.layoutSnapshot) {
      return items.length > 0;
    }

    return JSON.stringify(lot) !== JSON.stringify(lastAppliedRevision.layoutSnapshot);
  }, [items.length, lastAppliedRevision?.layoutSnapshot, lot]);

  const stats = useMemo(
    () => ({
      slots: items.filter((item) => item.type === 'slot').length,
      roads: items.filter((item) => item.type === 'road').length,
      gates: items.filter((item) => item.type === 'entry' || item.type === 'exit').length,
      markers: items.filter((item) => item.type === 'junction' || item.type === 'arrow').length,
    }),
    [items],
  );

  function getNodeCenter(item: Extract<DraftItem, { type: 'entry' | 'exit' | 'junction' }>) {
    const element = nodeRefs.current[item.id];
    const width = element?.offsetWidth ?? NODE_FALLBACK_WIDTH;
    const height = element?.offsetHeight ?? NODE_FALLBACK_HEIGHT;

    return {
      x: item.x + width / 2,
      y: item.y + height / 2,
    };
  }

  function recenterToMainEntryGate(targetZoom?: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const entryGate =
      items.find(
        (item): item is Extract<DraftItem, { type: 'entry' }> =>
          item.type === 'entry',
      ) ?? null;

    if (!entryGate) {
      fitToContent();
      return;
    }

    const entryCenter = getNodeCenter(entryGate);
    const padding = 160;
    const fitZoom = Math.min(
      1.2,
      Math.max(
        0.45,
        Math.min(
          (rect.width - padding) / Math.max(lotBounds.width, 960),
          (rect.height - padding) / Math.max(lotBounds.height, 760),
        ),
      ),
    );
    const effectiveZoom = Math.min(1.08, Math.max(0.72, fitZoom * 1.22));
    const clampedZoom = Math.min(1.3, Math.max(0.6, targetZoom ?? effectiveZoom));

    setZoomState(clampedZoom);
    setPanState({
      x: rect.width / 2 - entryCenter.x * clampedZoom,
      y: rect.height * 0.4 - entryCenter.y * clampedZoom,
    });
  }

  function fitToContent() {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const padding = 160;
    const fitZoom = Math.min(
      1.3,
      Math.max(
        0.4,
        Math.min(
          (rect.width - padding) / lotBounds.width,
          (rect.height - padding) / lotBounds.height,
        ),
      ),
    );

    setZoomState(fitZoom);
    setPanState({
      x: (rect.width - lotBounds.width * fitZoom) / 2,
      y: (rect.height - lotBounds.height * fitZoom) / 2,
    });
  }

  const hydrateLayoutState = useCallback((payload: {
    locationId: string;
    locationName?: string | null;
    layout?: ParkingLotDefinition | null;
    draftUpdatedAt?: string | null;
    lastAppliedRevision?: LayoutRevisionRecord | null;
    recentRevisions?: LayoutRevisionRecord[];
  }) => {
    setLocationId(payload.locationId);
    setLotName(payload.locationName ?? 'Parking Lot');
    setDraftUpdatedAt(payload.draftUpdatedAt ?? null);
    setLastAppliedRevision(payload.lastAppliedRevision ?? null);
    setRecentRevisions(payload.recentRevisions ?? []);

    if (payload.layout) {
      const hydratedItems = lotDefinitionToDraftItems(payload.layout) as DraftItem[];
      const { items: draftItems, changed } = ensureUniqueDraftItemIds(hydratedItems);
      setItems(draftItems);
      setSelectedId(draftItems[0]?.id ?? null);
      setSelectedIds(draftItems[0]?.id ? [draftItems[0].id] : []);
      if (changed) {
        setSaveState('error');
        setMessage('Duplicate builder object IDs were repaired while loading this layout. Review the map, then save again.');
      }
      return;
    }

    const base = createEmptyParkingLotDefinition(payload.locationName ?? 'Parking Lot');
    const draftItems = lotDefinitionToDraftItems(base) as DraftItem[];
    setItems(draftItems);
    setSelectedId(draftItems[0]?.id ?? null);
    setSelectedIds(draftItems[0]?.id ? [draftItems[0].id] : []);
  }, []);

  const loadLayout = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/operator/layout', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load parking lot layout.');
      }

      recordOperatorActionSuccess();
      hydrateLayoutState(payload as {
        locationId: string;
        locationName?: string | null;
        layout?: ParkingLotDefinition | null;
        draftUpdatedAt?: string | null;
        lastAppliedRevision?: LayoutRevisionRecord | null;
        recentRevisions?: LayoutRevisionRecord[];
      });
    } catch (error) {
      recordOperatorActionFailure();
      setMessage(error instanceof Error ? error.message : 'Failed to load parking lot layout.');
      setSaveState('error');
    } finally {
      setIsLoading(false);
    }
  }, [hydrateLayoutState]);

  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    if (isLoading || items.length === 0) {
      return;
    }

    recenterToMainEntryGate();
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const slotItems = items.filter((item): item is Extract<DraftItem, { type: 'slot' }> => item.type === 'slot');
    if (slotItems.length === 0) {
      return;
    }

    setAutoNumberPrefix(pickCanonicalSlotPrefix(slotItems));
  }, [items]);

  useEffect(() => {
    if (selectedItem?.type === 'slot') {
      setDefaultSlotWidth(selectedItem.width);
      setDefaultSlotHeight(selectedItem.height);
    }
  }, [selectedItem]);

  function collectRoadAndNodeSnapTargets(
    currentItems: DraftItem[],
    excludeRoadId?: string,
    excludePointIndex?: number,
    excludeNodeId?: string,
  ) {
    const roadPathTargets = currentItems
      .filter((item): item is Extract<DraftItem, { type: 'road' }> => item.type === 'road' && item.id !== excludeRoadId)
      .flatMap((road) => {
        return road.roadKind === 'curve'
          ? sampleRoadCurvePoints(road.points)
          : sampleRoadCurvePoints(road.points.slice(0, 2));
      });

    const roadTargets = collectRoadEndpointTargets(
      currentItems
        .filter((item): item is Extract<DraftItem, { type: 'road' }> => item.type === 'road')
        .map((road) => ({ id: road.id, points: road.points })),
      excludeRoadId,
      excludePointIndex,
    );

    const nodeTargets = currentItems
      .filter(
        (item): item is Extract<DraftItem, { type: 'entry' | 'exit' | 'junction' }> =>
          (item.type === 'entry' || item.type === 'exit' || item.type === 'junction') &&
          item.id !== excludeNodeId,
      )
      .map((item) => getDraftNodeCenter(item));

    return [...roadTargets, ...roadPathTargets, ...nodeTargets];
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const merged = { ...item, ...patch } as DraftItem;

        if (!isRoadDraftItem(merged) || !isRoadDraftItem(item)) {
          return merged;
        }

        if ('rotation' in patch && patch.rotation !== undefined) {
          if (merged.roadKind === 'straight') {
            return syncRoadFromPoints({
              ...merged,
              points: buildStraightRoadPointsFromAngle(item.points, patch.rotation),
            });
          }

          const currentRotation = item.rotation ?? 0;
          const delta = patch.rotation - currentRotation;
          return syncRoadFromPoints({
            ...merged,
            points: rotateRoadPoints(item.points, delta),
          });
        }

        if ('x' in patch || 'y' in patch) {
          return moveRoadToOrigin(merged, patch.x ?? merged.x, patch.y ?? merged.y);
        }

        if ('width' in patch && patch.width !== undefined && merged.roadKind === 'straight') {
          return extendStraightRoadEnd(merged, patch.width);
        }

        if ('width' in patch && patch.width !== undefined && merged.roadKind === 'curve') {
          return syncRoadFromPoints({
            ...merged,
            points: scaleRoadPointsOnAxis(item.points, Math.max(80, patch.width), 'x'),
          });
        }

        if ('height' in patch && patch.height !== undefined && merged.roadKind === 'curve') {
          return syncRoadFromPoints({
            ...merged,
            height: Math.max(48, patch.height),
            points: scaleRoadPointsOnAxis(item.points, Math.max(48, patch.height), 'y'),
          });
        }

        return syncRoadFromPoints(merged);
      }),
    );
  }

  function updateRoadPoint(roadId: string, pointIndex: number, patch: Partial<ParkingMapPoint>) {
    setItems((current) => {
      const snapTargets = collectRoadAndNodeSnapTargets(current, roadId, pointIndex);

      return current.map((item) => {
        if (item.id !== roadId || item.type !== 'road') {
          return item;
        }

        const point = item.points[pointIndex];
        if (!point) {
          return item;
        }

        return setRoadPoint(item, pointIndex, snapPointToGrid({ ...point, ...patch }), snapTargets);
      });
    });
  }

  function removeSelected() {
    if (selectedIds.length === 0) {
      return;
    }

    const selectedSet = new Set(selectedIds);
    setItems((current) => current.filter((item) => !selectedSet.has(item.id)));
    clearSelection();
  }

  function addItem(type: PaletteItemType, position?: ParkingMapPoint) {
    if (!canEditLayout) {
      setSaveState('error');
      setMessage('Your role is read-only for map layout editing.');
      return;
    }

    const point = position ?? {
      x: Math.round(lotBounds.width / 2 - 120),
      y: Math.round(lotBounds.height / 2 - 80),
    };
    const item = createDraftItem(type, snapValue(point.x), snapValue(point.y));
    const normalizedItem =
      item.type === 'slot'
        ? {
            ...item,
            width: defaultSlotWidth,
            height: defaultSlotHeight,
          }
        : item;
    setItems((current) => [...current, normalizedItem]);
    selectItem(normalizedItem.id);
  }

  function duplicateSlotRowFromSelected() {
    if (!canEditLayout) {
      setSaveState('error');
      setMessage('Your role is read-only for map layout editing.');
      return;
    }

    if (!selectedItem || selectedItem.type !== 'slot') {
      setSaveState('error');
      setMessage('Select a slot first before duplicating a row.');
      return;
    }

    const parsedCount = Number(rowCountDraft);
    const parsedSpacing = Number(rowSpacingDraft);
    const rowCount = Number.isFinite(parsedCount) ? Math.max(2, Math.round(parsedCount)) : 6;
    const rowSpacing = Number.isFinite(parsedSpacing) ? Math.max(0, parsedSpacing) : 24;
    const angle = (selectedItem.rotation * Math.PI) / 180;
    const step = selectedItem.width + rowSpacing;
    const stepX = Math.cos(angle) * step;
    const stepY = Math.sin(angle) * step;
    const parsedLabel = parseSlotLabel(selectedItem.label);
    const startNumber = parsedLabel.digits ? Number(parsedLabel.digits) : items.filter((item) => item.type === 'slot').length + 1;
    const parsedPadding = parsedLabel.digits?.length ?? 2;

    const newSlots = Array.from({ length: rowCount - 1 }, (_, index) => {
      const slotNumber = startNumber + index + 1;
      return {
        id: nextId('slot'),
        type: 'slot' as const,
        label: formatSlotLabel(parsedLabel.prefix, slotNumber, parsedPadding),
        status: selectedItem.status,
        x: snapValue(selectedItem.x + stepX * (index + 1)),
        y: snapValue(selectedItem.y + stepY * (index + 1)),
        rotation: selectedItem.rotation,
        width: selectedItem.width,
        height: selectedItem.height,
      };
    });

    setItems((current) => [...current, ...newSlots]);
    setSelectedId(newSlots[newSlots.length - 1]?.id ?? selectedItem.id);
    setSaveState('saved');
    setMessage(`Created a row of ${rowCount} slots from ${selectedItem.label}.`);
  }

  function autoNumberSlots() {
    if (!canEditLayout) {
      setSaveState('error');
      setMessage('Your role is read-only for map layout editing.');
      return;
    }

    const { items: sanitizedItems, changed: changedIds } = ensureUniqueDraftItemIds(items);
    if (changedIds) {
      setItems(sanitizedItems);
    }

    const sortedSlots = sanitizedItems
      .filter((item): item is Extract<DraftItem, { type: 'slot' }> => item.type === 'slot')
      .sort((left, right) => {
        if (Math.abs(left.y - right.y) > 24) {
          return left.y - right.y;
        }

        return left.x - right.x;
      });

    if (sortedSlots.length === 0) {
      setSaveState('error');
      setMessage('There are no slots to auto-number.');
      return;
    }

    const prefix = autoNumberPrefix.trim() || 'S';
    const padding = Math.max(2, String(sortedSlots.length).length);
    const renumberedSlots = renumberSlotLabels(sortedSlots, prefix, padding);
    const labelById = new Map(renumberedSlots.map((slot) => [slot.id, slot.label]));
    const duplicates = findDuplicateSlotLabels(renumberedSlots);

    if (duplicates.length > 0) {
      setSaveState('error');
      setMessage(`Auto-numbering still produced duplicate labels: ${duplicates.join(', ')}.`);
      return;
    }

    setItems((current) =>
      (changedIds ? sanitizedItems : current).map((item) =>
        item.type === 'slot' ? { ...item, label: labelById.get(item.id) ?? item.label } : item,
      ),
    );
    setSaveState('saved');
    setMessage(
      changedIds
        ? `Duplicate object IDs were repaired, then auto-numbered ${sortedSlots.length} slots with prefix ${prefix}.`
        : `Auto-numbered ${sortedSlots.length} slots with prefix ${prefix}.`,
    );
  }

  function normalizeDraftSlotLabelsBeforePersist() {
    const { items: sanitizedItems, changed: changedIds } = ensureUniqueDraftItemIds(items);
    const slotItems = sanitizedItems.filter((item): item is Extract<DraftItem, { type: 'slot' }> => item.type === 'slot');
    if (slotItems.length === 0) {
      return true;
    }

    const normalizedSlots = ensureUniqueSlotLabels(slotItems);
    const duplicates = findDuplicateSlotLabels(normalizedSlots);
    const hasBlankLabels = normalizedSlots.some((slot) => slot.label.trim().length === 0);
    const changed = changedIds || normalizedSlots.some((slot, index) => slot.label !== slotItems[index]?.label);

    if (!changed && duplicates.length === 0 && !hasBlankLabels) {
      return true;
    }

    const normalizedById = new Map(normalizedSlots.map((slot) => [slot.id, slot.label]));
    setItems(
      sanitizedItems.map((item) =>
        item.type === 'slot'
          ? {
              ...item,
              label: normalizedById.get(item.id) ?? item.label,
            }
          : item,
      ),
    );
    setSaveState('error');
    setMessage(
      changedIds
        ? 'Duplicate object IDs and duplicate or blank slot labels were normalized in the draft. Review the updated numbering, then save or apply again.'
        : 'Duplicate or blank slot labels were normalized in the draft. Review the updated numbering, then save or apply again.',
    );
    return false;
  }

  function handlePaletteDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) {
      return;
    }

    try {
      const payload = JSON.parse(raw) as { type?: PaletteItemType };
      if (!payload.type) {
        return;
      }

      addItem(payload.type, snapPointToGrid(screenToLot(event.clientX, event.clientY)));
    } catch {
      // ignore invalid payload
    }
  }

  function beginItemMove(itemId: string, event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();

    const item = items.find((entry) => entry.id === itemId);
    if (!item || item.type === 'road') {
      return;
    }

    selectItem(itemId, event.shiftKey || event.ctrlKey || event.metaKey);
    setCanvasDrag({
      mode: 'move-item',
      itemId,
      pointerStart: screenToLot(event.clientX, event.clientY),
      originX: item.x,
      originY: item.y,
    });
  }

  function beginRoadMove(roadId: string, event: React.PointerEvent<SVGPathElement>) {
    const road = items.find((item) => item.id === roadId && item.type === 'road');
    if (!road || road.type !== 'road') {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    selectItem(roadId, event.shiftKey || event.ctrlKey || event.metaKey);
    setCanvasDrag({
      mode: 'road-move',
      roadId,
      pointerStart: screenToLot(event.clientX, event.clientY),
      originPoints: road.points.map((point) => ({ ...point })),
    });
  }

  function beginRoadPointDrag(roadId: string, pointIndex: number, event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    selectItem(roadId, event.shiftKey || event.ctrlKey || event.metaKey);
    setCanvasDrag({ mode: 'road-point', roadId, pointIndex });
  }

  function beginRotateItem(itemId: string, center: ParkingMapPoint, event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();

    const item = items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    selectItem(itemId, event.shiftKey || event.ctrlKey || event.metaKey);
    setCanvasDrag({
      mode: 'rotate-item',
      itemId,
      center,
      originRotation: item.rotation,
    });
  }

  function beginRoadWidthDrag(
    roadId: string,
    center: ParkingMapPoint,
    normal: ParkingMapPoint,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    event.preventDefault();

    const road = items.find((entry) => entry.id === roadId && entry.type === 'road');
    if (!road || road.type !== 'road') {
      return;
    }

    selectItem(roadId, event.shiftKey || event.ctrlKey || event.metaKey);
    setCanvasDrag({
      mode: 'road-width',
      roadId,
      center,
      normal,
      originHeight: road.height,
    });
  }

  function beginSlotResize(
    itemId: string,
    center: ParkingMapPoint,
    rotation: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    event.preventDefault();

    selectItem(itemId, event.shiftKey || event.ctrlKey || event.metaKey);
    setCanvasDrag({
      mode: 'slot-size',
      itemId,
      center,
      rotation,
    });
  }

  function alignSelected(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    if (!canEditLayout) {
      setSaveState('error');
      setMessage('Your role is read-only for map layout editing.');
      return;
    }

    const selectedSet = new Set(selectedIds);
    const movable = items.filter(
      (item) => selectedSet.has(item.id) && item.type !== 'road',
    ) as Array<Exclude<DraftItem, Extract<DraftItem, { type: 'road' }>>>;

    if (movable.length < 2) {
      setSaveState('error');
      setMessage('Select at least two non-road objects to align them.');
      return;
    }

    const bounds = movable.map((item) => ({ id: item.id, ...getItemBox(item) }));

    const targetLeft = Math.min(...bounds.map((entry) => entry.x));
    const targetTop = Math.min(...bounds.map((entry) => entry.y));
    const targetRight = Math.max(...bounds.map((entry) => entry.x + entry.width));
    const targetBottom = Math.max(...bounds.map((entry) => entry.y + entry.height));
    const targetCenterX = (targetLeft + targetRight) / 2;
    const targetCenterY = (targetTop + targetBottom) / 2;

    setItems((current) =>
      current.map((item) => {
        const box = bounds.find((entry) => entry.id === item.id);
        if (!box) {
          return item;
        }

        let nextX = box.x;
        let nextY = box.y;

        if (mode === 'left') nextX = targetLeft;
        if (mode === 'center') nextX = targetCenterX - box.width / 2;
        if (mode === 'right') nextX = targetRight - box.width;
        if (mode === 'top') nextY = targetTop;
        if (mode === 'middle') nextY = targetCenterY - box.height / 2;
        if (mode === 'bottom') nextY = targetBottom - box.height;

        return {
          ...item,
          x: snapValue(nextX),
          y: snapValue(nextY),
        } as typeof item;
      }),
    );

    setSaveState('saved');
    setMessage(`Aligned ${movable.length} objects.`);
  }

  function distributeSelected(axis: 'horizontal' | 'vertical') {
    if (!canEditLayout) {
      setSaveState('error');
      setMessage('Your role is read-only for map layout editing.');
      return;
    }

    const selectedSet = new Set(selectedIds);
    const movable = items.filter(
      (item) => selectedSet.has(item.id) && item.type !== 'road',
    ) as Array<Exclude<DraftItem, Extract<DraftItem, { type: 'road' }>>>;

    if (movable.length < 3) {
      setSaveState('error');
      setMessage('Select at least three non-road objects to distribute them.');
      return;
    }

    const bounds = movable
      .map((item) => ({ item, ...getItemBox(item) }))
      .sort((left, right) => (axis === 'horizontal' ? left.x - right.x : left.y - right.y));

    const first = bounds[0];
    const last = bounds[bounds.length - 1];
    const totalSize = bounds.reduce((sum, entry) => sum + (axis === 'horizontal' ? entry.width : entry.height), 0);
    const start = axis === 'horizontal' ? first.x : first.y;
    const end = axis === 'horizontal' ? last.x + last.width : last.y + last.height;
    const gap = (end - start - totalSize) / (bounds.length - 1);

    let cursor = start;
    const nextPositionById = new Map<string, { x: number; y: number }>();

    for (const entry of bounds) {
      nextPositionById.set(entry.item.id, {
        x: axis === 'horizontal' ? cursor : entry.x,
        y: axis === 'vertical' ? cursor : entry.y,
      });
      cursor += (axis === 'horizontal' ? entry.width : entry.height) + gap;
    }

    setItems((current) =>
      current.map((item) => {
        const next = nextPositionById.get(item.id);
        if (!next || item.type === 'road') {
          return item;
        }

        return {
          ...item,
          x: snapValue(next.x),
          y: snapValue(next.y),
        } as typeof item;
      }),
    );

    setSaveState('saved');
    setMessage(`Distributed ${movable.length} objects ${axis}.`);
  }

  function handleViewportPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-lot-object="true"]')) {
      return;
    }

    if (event.shiftKey) {
      const point = screenToLot(event.clientX, event.clientY);
      setSelectionMarquee({ start: point, current: point });
      return;
    }

    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: panRef.current.x,
      startY: panRef.current.y,
    };
    clearSelection();
    setIsPanning(true);
  }

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      const lotPoint = snapPointToGrid(screenToLot(event.clientX, event.clientY));

      if (selectionMarquee) {
        setSelectionMarquee((current) => (current ? { ...current, current: screenToLot(event.clientX, event.clientY) } : current));
        return;
      }

      if (drag) {
        if (drag.mode === 'move-item') {
          const deltaX = lotPoint.x - drag.pointerStart.x;
          const deltaY = lotPoint.y - drag.pointerStart.y;
          setItems((current) =>
            current.map((item) => {
              if (item.id !== drag.itemId || item.type === 'road') {
                return item;
              }

              if (item.type === 'entry' || item.type === 'exit' || item.type === 'junction') {
                const candidateCenter = {
                  x: drag.originX + deltaX + NODE_FALLBACK_WIDTH / 2,
                  y: drag.originY + deltaY + NODE_FALLBACK_HEIGHT / 2,
                };
                const snappedCenter = snapPoint(
                  candidateCenter,
                  collectRoadAndNodeSnapTargets(current, undefined, undefined, item.id),
                );
                const nextPosition = moveNodeTopLeftToCenter(item, snappedCenter);

                return {
                  ...item,
                  x: snapValue(nextPosition.x),
                  y: snapValue(nextPosition.y),
                };
              }

              return {
                ...item,
                x: snapValue(drag.originX + deltaX),
                y: snapValue(drag.originY + deltaY),
              };
            }),
          );
          return;
        }

        if (drag.mode === 'road-move') {
          const deltaX = lotPoint.x - drag.pointerStart.x;
          const deltaY = lotPoint.y - drag.pointerStart.y;

          setItems((current) =>
            current.map((item) => {
              if (item.id !== drag.roadId || item.type !== 'road') {
                return item;
              }

              return syncRoadFromPoints({
                ...item,
                points: drag.originPoints.map((point) => ({
                  x: snapValue(point.x + deltaX),
                  y: snapValue(point.y + deltaY),
                })),
              });
            }),
          );
          return;
        }

        if (drag.mode === 'rotate-item') {
          const angle =
            (Math.atan2(lotPoint.y - drag.center.y, lotPoint.x - drag.center.x) * 180) / Math.PI + 90;

          setItems((current) =>
            current.map((item) => {
              if (item.id !== drag.itemId) {
                return item;
              }

              if (item.type === 'road') {
                if (item.roadKind === 'straight') {
                  return syncRoadFromPoints({
                    ...item,
                    points: buildStraightRoadPointsFromAngle(item.points, angle),
                  });
                }

                return syncRoadFromPoints({
                  ...item,
                  points: rotateRoadPoints(item.points, angle - item.rotation),
                });
              }

              return {
                ...item,
                rotation: Math.round(angle / 5) * 5,
              };
            }),
          );
          return;
        }

        if (drag.mode === 'road-width') {
          const deltaX = lotPoint.x - drag.center.x;
          const deltaY = lotPoint.y - drag.center.y;
          const projected = deltaX * drag.normal.x + deltaY * drag.normal.y;
          const nextHeight = Math.max(48, Math.abs(projected) * 2);

          setItems((current) =>
            current.map((item) =>
              item.id === drag.roadId && item.type === 'road'
                ? syncRoadFromPoints({ ...item, height: snapValue(nextHeight) })
                : item,
            ),
          );
          return;
        }

        if (drag.mode === 'slot-size') {
          const local = toLocalPoint(lotPoint, drag.center, drag.rotation);
          const nextWidth = Math.max(MIN_SLOT_WIDTH, Math.abs(local.x) * 2);
          const nextHeight = Math.max(MIN_SLOT_HEIGHT, Math.abs(local.y) * 2);

          setItems((current) =>
            current.map((item) => {
              if (item.id !== drag.itemId || item.type !== 'slot') {
                return item;
              }

              return {
                ...item,
                width: snapValue(nextWidth),
                height: snapValue(nextHeight),
                x: snapValue(drag.center.x - snapValue(nextWidth) / 2),
                y: snapValue(drag.center.y - snapValue(nextHeight) / 2),
              };
            }),
          );
          return;
        }

        const snapTargets = collectRoadAndNodeSnapTargets(items, drag.roadId, drag.pointIndex);

        setItems((current) =>
          current.map((item) => {
            if (item.id !== drag.roadId || item.type !== 'road') {
              return item;
            }

            return setRoadPoint(item, drag.pointIndex, lotPoint, snapTargets);
          }),
        );
        return;
      }

      if (isPanning) {
        const dx = event.clientX - panStartRef.current.clientX;
        const dy = event.clientY - panStartRef.current.clientY;
        setPanState({
          x: panStartRef.current.startX + dx,
          y: panStartRef.current.startY + dy,
        });
      }
    }

    function handlePointerUp() {
      const drag = dragRef.current;
      if (selectionMarquee) {
        const minX = Math.min(selectionMarquee.start.x, selectionMarquee.current.x);
        const minY = Math.min(selectionMarquee.start.y, selectionMarquee.current.y);
        const maxX = Math.max(selectionMarquee.start.x, selectionMarquee.current.x);
        const maxY = Math.max(selectionMarquee.start.y, selectionMarquee.current.y);
        const within = items.filter((item) => {
          const box = getItemBox(item);
          return box.x < maxX && box.x + box.width > minX && box.y < maxY && box.y + box.height > minY;
        });

        if (within.length > 0) {
          setSelectedIds(within.map((item) => item.id));
          setSelectedId(within[within.length - 1]?.id ?? null);
          setMobileInspectorOpen(true);
        } else {
          clearSelection();
        }

        setSelectionMarquee(null);
        setIsPanning(false);
        return;
      }

      if (drag?.mode === 'road-point') {
        setItems((current) =>
          current.map((item) => {
            if (item.id !== drag.roadId || item.type !== 'road') {
              return item;
            }

            return connectRoadEndpointToNearest(
              item,
              drag.roadId,
              drag.pointIndex,
              current
                .filter((entry): entry is Extract<DraftItem, { type: 'road' }> => entry.type === 'road')
                .map((road) => ({ id: road.id, points: road.points })),
            );
          }),
        );
      }

      setCanvasDrag(null);
      setIsPanning(false);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isPanning, items, gridSize, selectionMarquee]);

  async function requestLayoutPreview(
    sourceLayout: ParkingLotDefinition,
    options?: { applyMap?: boolean; rollbackToRevisionId?: string | null },
  ) {
    if (!locationId) {
      throw new Error('No active parking location is configured for this builder.');
    }

    const response = await fetch('/api/operator/layout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        layout: sourceLayout,
        applyMap: Boolean(options?.applyMap),
        rollbackToRevisionId: options?.rollbackToRevisionId ?? null,
        previewOnly: true,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.preview) {
      throw new Error(payload?.error || 'Failed to load layout preview.');
    }

    recordOperatorActionSuccess();
    return payload.preview as LayoutPreview;
  }

  async function openApplyDialog() {
    try {
      const preview = await requestLayoutPreview(lot, { applyMap: true });
      setPendingLayoutAction({
        kind: 'apply',
        title: 'Apply Parking Map',
        description: `This will sync slot inventory and publish the current draft for ${preview.locationName}.`,
        sourceLayout: lot,
        preview,
      });
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to load layout preview.');
    }
  }

  async function openRollbackDialog() {
    if (!lastAppliedRevision?.layoutSnapshot) {
      setSaveState('error');
      setMessage('No applied map revision is available for rollback.');
      return;
    }

    try {
      const preview = await requestLayoutPreview(lastAppliedRevision.layoutSnapshot, {
        applyMap: true,
        rollbackToRevisionId: lastAppliedRevision.revisionId,
      });
      setPendingLayoutAction({
        kind: 'rollback',
        title: 'Rollback to Last Applied Map',
        description: `This will republish revision ${lastAppliedRevision.revisionId.slice(0, 8)} for ${preview.locationName}.`,
        sourceLayout: lastAppliedRevision.layoutSnapshot,
        rollbackToRevisionId: lastAppliedRevision.revisionId,
        preview,
      });
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Failed to load rollback preview.');
    }
  }

  async function persistLayout(options?: { applyMap?: boolean; sourceLayout?: ParkingLotDefinition; rollbackToRevisionId?: string | null }) {
    if (!locationId) {
      setSaveState('error');
      setMessage('No active parking location is configured for this builder.');
      return;
    }

    if (!canEditLayout) {
      setSaveState('error');
      setMessage('Your role is read-only for map layout editing.');
      return;
    }

    if (!options?.sourceLayout && !normalizeDraftSlotLabelsBeforePersist()) {
      return;
    }

    setSaveState('saving');
    setMessage(null);

    try {
      const response = await fetch('/api/operator/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId,
          layout: options?.sourceLayout ?? lot,
          applyMap: Boolean(options?.applyMap),
          rollbackToRevisionId: options?.rollbackToRevisionId ?? null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save layout.');
      }
      await loadLayout();

      if (options?.applyMap) {
        await refreshOperatorData({ silent: true });
      }

      setSaveState('saved');
      setPendingLayoutAction(null);
      recordOperatorActionSuccess();
      setMessage(
        options?.rollbackToRevisionId
          ? 'Parking map rolled back to the last applied revision.'
          : options?.applyMap
            ? 'Parking map applied to the backend inventory.'
            : 'Parking lot layout saved as draft.',
      );
    } catch (error) {
      recordOperatorActionFailure();
      setSaveState('error');
      setMessage(
        error instanceof Error
          ? error.message
          : options?.rollbackToRevisionId
            ? 'Failed to roll back parking map.'
            : options?.applyMap
              ? 'Failed to apply parking map.'
              : 'Failed to save layout.',
      );
    }
  }

  return (
    <DashboardLayout fullWidth>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Map Builder</h1>
            <p className="mt-2 text-muted-foreground">
              Build a full parking lot layout with draggable slots, gates, access markers, and connected road geometry.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-border xl:hidden"
              onClick={() => setMobileInspectorOpen(true)}
              disabled={!selectedItem}
            >
              <MapPin className="h-4 w-4" />
              Inspector
            </Button>
            <Button variant="outline" className="border-border" onClick={() => recenterToMainEntryGate()}>
              <MapPin className="h-4 w-4" />
              Recenter Entry
            </Button>
            <Button variant="outline" className="border-border" onClick={fitToContent}>
              <Move className="h-4 w-4" />
              Fit Canvas
            </Button>
            <Button variant="outline" className="border-border" onClick={() => setZoomState(Math.max(0.4, zoom - 0.1))}>
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </Button>
            <Button variant="outline" className="border-border" onClick={() => setZoomState(Math.min(1.8, zoom + 0.1))}>
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </Button>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => void openRollbackDialog()}
              disabled={!canEditLayout || saveState === 'saving' || !lastAppliedRevision?.layoutSnapshot}
            >
              {saveState === 'saving' && pendingLayoutAction?.kind === 'rollback' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Rollback
            </Button>
            <Button
              variant="outline"
              className="border-border"
              onClick={() => void openApplyDialog()}
              disabled={!canEditLayout || saveState === 'saving'}
            >
              {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Apply Map
            </Button>
            <Button onClick={() => void persistLayout()} disabled={!canEditLayout || saveState === 'saving'}>
              {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Layout
            </Button>
          </div>
        </div>

        <AlertDialog open={Boolean(pendingLayoutAction)} onOpenChange={(open) => (!open ? setPendingLayoutAction(null) : null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingLayoutAction?.title ?? 'Confirm map action'}</AlertDialogTitle>
              <AlertDialogDescription>{pendingLayoutAction?.description ?? ''}</AlertDialogDescription>
            </AlertDialogHeader>
            {pendingLayoutAction ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Slots</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {pendingLayoutAction.preview.layoutSummary.slotCount}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Objects</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {pendingLayoutAction.preview.layoutSummary.totalObjectCount}
                  </div>
                </div>
                {pendingLayoutAction.preview.impactSummary ? (
                  <>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Inserts</div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {pendingLayoutAction.preview.impactSummary.insertCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Updates</div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {pendingLayoutAction.preview.impactSummary.updateCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Archives</div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {pendingLayoutAction.preview.impactSummary.archiveCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Temporary Relabels</div>
                      <div className="mt-2 text-lg font-semibold text-foreground">
                        {pendingLayoutAction.preview.impactSummary.temporaryRelabelCount}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  if (!pendingLayoutAction) {
                    return;
                  }
                  void persistLayout({
                    applyMap: true,
                    sourceLayout: pendingLayoutAction.sourceLayout,
                    rollbackToRevisionId: pendingLayoutAction.rollbackToRevisionId ?? null,
                  });
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              saveState === 'error'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {message}
          </div>
        ) : null}

        {!canEditLayout ? (
          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            Read-only access. Your role can inspect the lot layout but cannot save, apply, or edit map geometry.
          </div>
        ) : null}

        {mobileInspectorOpen ? (
          <button
            type="button"
            aria-label="Close inspector backdrop"
            className="fixed inset-0 z-40 bg-black/50 xl:hidden"
            onClick={() => setMobileInspectorOpen(false)}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Builder Tools</CardTitle>
                <CardDescription>
                  Collapse and reopen any tool group without losing access to the others.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" defaultValue={["palette"]} className="w-full">
                  <AccordionItem value="publishing-status" className="border-border">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Publishing Status</div>
                        <div className="mt-1 text-xs text-muted-foreground">Track the current draft against the last applied revision.</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border bg-secondary/40 p-3">
                            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Draft</div>
                            <div className="mt-2 text-sm font-semibold text-foreground">
                              {hasUnappliedDraftChanges ? 'Unapplied changes' : 'Matches applied map'}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-secondary/40 p-3">
                            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Last Saved</div>
                            <div className="mt-2 text-sm font-semibold text-foreground">
                              {draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleString() : 'Not saved'}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Last Applied Revision</div>
                          <div className="mt-2 text-sm font-semibold text-foreground">
                            {lastAppliedRevision ? `${lastAppliedRevision.revisionId.slice(0, 8)} • ${new Date(lastAppliedRevision.createdAt).toLocaleString()}` : 'No applied revision yet'}
                          </div>
                          {lastAppliedRevision?.impactSummary ? (
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>+{lastAppliedRevision.impactSummary.insertCount} inserts</div>
                              <div>{lastAppliedRevision.impactSummary.updateCount} updates</div>
                              <div>{lastAppliedRevision.impactSummary.archiveCount} archives</div>
                            </div>
                          ) : null}
                        </div>
                        {recentRevisions.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Recent Revisions</div>
                            <div className="space-y-2">
                              {recentRevisions.slice(0, 4).map((revision) => (
                                <div key={revision.eventId} className="rounded-lg border border-border bg-secondary/20 p-3 text-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium capitalize text-foreground">{revision.action}</div>
                                    <div className="text-xs text-muted-foreground">{new Date(revision.createdAt).toLocaleString()}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {revision.revisionId.slice(0, 8)} • {revision.objectSummary.slotCount} slots
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="layout-settings" className="border-border">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Layout Settings</div>
                        <div className="mt-1 text-xs text-muted-foreground">Configure the lot name, grid snap, and editing scale.</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Lot Name</label>
                          <Input value={lotName} onChange={(event) => setLotName(event.target.value)} className="border-border bg-input" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            <span>Grid Snap</span>
                            <span>{gridSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={GRID_MIN}
                            max={GRID_MAX}
                            value={gridSize}
                            onChange={(event) => setGridSize(Number(event.target.value))}
                            className="w-full accent-primary"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border bg-secondary/40 p-3">
                            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Canvas</div>
                            <div className="mt-2 text-sm font-semibold text-foreground">
                              {lotBounds.width} x {lotBounds.height}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-secondary/40 p-3">
                            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Zoom</div>
                            <div className="mt-2 text-sm font-semibold text-foreground">{Math.round(zoom * 100)}%</div>
                          </div>
                        </div>
                        <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Default Slot Footprint</div>
                          <div className="grid grid-cols-2 gap-3">
                            <DeferredNumberInput
                              value={defaultSlotWidth}
                              onCommit={(value) => setDefaultSlotWidth(Math.max(MIN_SLOT_WIDTH, value))}
                              className="border-border bg-input"
                            />
                            <DeferredNumberInput
                              value={defaultSlotHeight}
                              onCommit={(value) => setDefaultSlotHeight(Math.max(MIN_SLOT_HEIGHT, value))}
                              className="border-border bg-input"
                            />
                          </div>
                          <Button
                            variant="outline"
                            className="w-full border-border"
                            disabled={!canEditLayout}
                            onClick={() =>
                              setItems((current) =>
                                current.map((item) =>
                                  item.type === 'slot'
                                    ? {
                                        ...item,
                                        width: defaultSlotWidth,
                                        height: defaultSlotHeight,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            Apply Footprint to All Slots
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="palette" className="border-border">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Palette</div>
                        <div className="mt-1 text-xs text-muted-foreground">Drag onto the canvas or click to place at center.</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
                        {palette.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.type}
                              type="button"
                              draggable={canEditLayout}
                              disabled={!canEditLayout}
                              onClick={() => addItem(item.type)}
                              onDragStart={(event) => {
                                if (!canEditLayout) {
                                  event.preventDefault();
                                  return;
                                }
                                event.dataTransfer.setData('application/json', JSON.stringify({ type: item.type }));
                              }}
                              className="flex w-full items-start gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-3 text-left transition-colors hover:bg-secondary"
                            >
                              <div className="rounded-md bg-background p-2 text-primary">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground">{item.label}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="slot-row-tools" className="border-border">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Slot Row Tools</div>
                        <div className="mt-1 text-xs text-muted-foreground">Duplicate rows from a selected slot and normalize slot numbering.</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Row Size</label>
                            <Input
                              value={rowCountDraft}
                              onChange={(event) => setRowCountDraft(event.target.value)}
                              className="border-border bg-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Gap</label>
                            <Input
                              value={rowSpacingDraft}
                              onChange={(event) => setRowSpacingDraft(event.target.value)}
                              className="border-border bg-input"
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-border"
                          disabled={!canEditLayout}
                          onClick={duplicateSlotRowFromSelected}
                        >
                          <Plus className="h-4 w-4" />
                          Duplicate Row From Selected Slot
                        </Button>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Numbering Prefix</label>
                          <Input
                            value={autoNumberPrefix}
                            onChange={(event) => setAutoNumberPrefix(event.target.value)}
                            className="border-border bg-input"
                          />
                        </div>
                        <Button variant="outline" className="w-full border-border" disabled={!canEditLayout} onClick={autoNumberSlots}>
                          Auto-Number Slots
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="alignment-tools" className="border-border">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Alignment Tools</div>
                        <div className="mt-1 text-xs text-muted-foreground">Use multi-select with Shift-click, then align selected non-road objects.</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/20 p-4">
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => alignSelected('left')}>
                          Left
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => alignSelected('center')}>
                          Center
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => alignSelected('right')}>
                          Right
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => alignSelected('top')}>
                          Top
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => alignSelected('middle')}>
                          Middle
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => alignSelected('bottom')}>
                          Bottom
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => distributeSelected('horizontal')}>
                          Dist X
                        </Button>
                        <Button variant="outline" className="border-border" disabled={!canEditLayout} onClick={() => distributeSelected('vertical')}>
                          Dist Y
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base text-foreground">Canvas</CardTitle>
                  <CardDescription>
                    Drag the background to pan. Use the mouse wheel to zoom toward the pointer. Drag endpoints to connect roads.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-border" onClick={() => recenterToMainEntryGate()}>
                    <MapPin className="h-4 w-4" />
                    Recenter Entry
                  </Button>
                  <Button size="sm" variant="outline" className="border-border" onClick={() => setZoomState(1)}>
                    Reset Zoom
                  </Button>
                  <Button size="sm" variant="outline" className="border-border" onClick={fitToContent}>
                    Fit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div
                ref={viewportRef}
                onPointerDown={handleViewportPointerDown}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handlePaletteDrop}
                className="relative h-[70vh] min-h-[560px] overflow-hidden overscroll-contain rounded-lg border border-border bg-secondary/30"
              >
                {isLoading ? (
                  <div className="absolute inset-0 z-20 grid place-items-center">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading parking lot layout...
                    </div>
                  </div>
                ) : null}

                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: lotBounds.width,
                    height: lotBounds.height,
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-xl border border-border/50 bg-background/60"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(148, 163, 184, 0.10) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148, 163, 184, 0.10) 1px, transparent 1px)
                      `,
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                    }}
                  />

                  <svg
                    width={lotBounds.width}
                    height={lotBounds.height}
                    className="absolute inset-0 overflow-visible"
                    shapeRendering="geometricPrecision"
                  >
                    {roadItems.map((road) => {
                      const roadModel: ParkingMapRoad = {
                        id: road.id,
                        kind: road.roadKind,
                        label: road.label,
                        x: road.x,
                        y: road.y,
                        width: road.width,
                        height: road.height,
                        rotation: road.rotation,
                        direction: 'east',
                        points: road.points,
                      };
                      const shape = buildRoadShape(roadModel);
                      const stroke = getRoadStroke(road.roadKind);
                      const roadIsSelected = isSelected(road.id);
                      const roadBodyWidth = normalizeRoadStrokeWidth(road.height);
                      const roadCenterDash = roadIsSelected ? '#f8fafc' : '#e2e8f0';

                      return (
                        <g key={road.id}>
                          <path
                            d={shape.d}
                            stroke={roadIsSelected ? '#60a5fa' : stroke}
                            strokeWidth={roadBodyWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            opacity={0.96}
                          />
                          <path
                            d={shape.d}
                            stroke={roadCenterDash}
                            strokeWidth={Math.max(4, Math.min(8, roadBodyWidth * 0.1))}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={`${Math.max(18, roadBodyWidth * 0.45)} ${Math.max(12, roadBodyWidth * 0.3)}`}
                            fill="none"
                            opacity={0.85}
                          />
                          <path
                            d={shape.d}
                            stroke="transparent"
                            strokeWidth={Math.max(56, roadBodyWidth + 12)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            onPointerDown={(event) => beginRoadMove(road.id, event)}
                            className="cursor-grab"
                          />
                          <text
                            x={shape.labelX}
                            y={shape.labelY}
                            fill="#e2e8f0"
                            fontSize="13"
                            fontWeight="700"
                            textAnchor="middle"
                            className="pointer-events-none select-none"
                          >
                            {road.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {roadItems.map((road) => (
                    <div key={`${road.id}-handles`}>
                      {road.points.map((point, pointIndex) => {
                        const isStart = pointIndex === 0;
                        const isEnd = pointIndex === road.points.length - 1;
                        const isBend = !isStart && !isEnd;
                        const roadIsSelected = isSelected(road.id);

                        return (
                          <button
                            key={`${road.id}-point-${pointIndex}`}
                            type="button"
                            data-lot-object="true"
                            onPointerDown={(event) => beginRoadPointDrag(road.id, pointIndex, event)}
                            className={`absolute grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold ${
                              isStart
                                ? 'border-sky-300 bg-sky-500/20 text-sky-100'
                                : isEnd
                                  ? 'border-amber-300 bg-amber-500/20 text-amber-100'
                                  : 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                            } ${roadIsSelected ? 'shadow-[0_0_0_6px_rgba(59,130,246,0.15)]' : ''}`}
                            style={{
                              left: point.x - 14,
                              top: point.y - 14,
                            }}
                          >
                            {isStart ? 'S' : isEnd ? 'E' : pointIndex}
                          </button>
                        );
                      })}

                      {isSelected(road.id) ? (() => {
                        const start = road.points[0];
                        const end = road.points[road.points.length - 1];
                        const center = {
                          x: (start.x + end.x) / 2,
                          y: (start.y + end.y) / 2,
                        };
                        const dx = end.x - start.x;
                        const dy = end.y - start.y;
                        const length = Math.max(1, Math.hypot(dx, dy));
                        const normal = { x: -dy / length, y: dx / length };
                        const rotationHandle = {
                          x: center.x + normal.x * (road.height / 2 + 54),
                          y: center.y + normal.y * (road.height / 2 + 54),
                        };
                        const widthHandle = {
                          x: center.x + normal.x * (road.height / 2),
                          y: center.y + normal.y * (road.height / 2),
                        };

                        return (
                          <>
                            <button
                              type="button"
                              data-lot-object="true"
                              onPointerDown={(event) => beginRotateItem(road.id, center, event)}
                              className="absolute grid h-8 w-8 place-items-center rounded-full border border-blue-300 bg-blue-500/20 text-blue-100 shadow-[0_0_0_6px_rgba(59,130,246,0.15)]"
                              style={{ left: rotationHandle.x - 16, top: rotationHandle.y - 16 }}
                            >
                              <RotateCw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              data-lot-object="true"
                              onPointerDown={(event) => beginRoadWidthDrag(road.id, center, normal, event)}
                              className="absolute grid h-8 w-8 place-items-center rounded-full border border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]"
                              style={{ left: widthHandle.x - 16, top: widthHandle.y - 16 }}
                            >
                              <Move className="h-4 w-4" />
                            </button>
                          </>
                        );
                      })() : null}
                    </div>
                  ))}

                  {items.map((item) => {
                    if (item.type === 'road') {
                      return null;
                    }

                    if (item.type === 'slot') {
                      const selected = isSelected(item.id);
                      const frame = getRenderedSlotFrame(item);
                      const statusLabel = getSlotStatusDisplay(item.status);
                      const labelFontSize = getSlotLabelFontSize(item.width, item.label);
                      const statusFontSize = getSlotStatusFontSize(item.width, statusLabel);
                      return (
                        <>
                          <button
                            key={item.id}
                            type="button"
                            data-lot-object="true"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectItem(item.id, event.shiftKey || event.ctrlKey || event.metaKey);
                            }}
                            onPointerDown={(event) => beginItemMove(item.id, event)}
                            className={`absolute flex flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-2 py-2 text-center shadow-sm transition-shadow ${getSlotColors(
                              item.status,
                            )} ${selected ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.18)]' : ''}`}
                            style={{
                              left: frame.x,
                              top: frame.y,
                              width: item.width,
                              height: item.height,
                              transform: `rotate(${item.rotation}deg)`,
                              cursor: canvasDrag?.mode === 'move-item' && canvasDrag.itemId === item.id ? 'grabbing' : 'grab',
                            }}
                          >
                            <span
                              className="max-w-full truncate font-semibold leading-none"
                              style={{ fontSize: `${labelFontSize}px` }}
                            >
                              {item.label}
                            </span>
                            <span
                              className="max-w-full truncate font-medium leading-none opacity-90"
                              style={{ fontSize: `${statusFontSize}px` }}
                            >
                              {statusLabel}
                            </span>
                          </button>
                          {selected ? (
                            <>
                              {(() => {
                                const center = frame.center;
                                const rotationHandle = rotatePointAround(
                                  { x: center.x, y: frame.y - 28 },
                                  center,
                                  item.rotation,
                                );
                                const resizeHandle = rotatePointAround(
                                  { x: frame.x + item.width, y: frame.y + item.height },
                                  center,
                                  item.rotation,
                                );

                                return (
                                  <>
                                    <button
                                      type="button"
                                      data-lot-object="true"
                                      onPointerDown={(event) => beginRotateItem(item.id, center, event)}
                                      className="absolute grid h-8 w-8 place-items-center rounded-full border border-blue-300 bg-blue-500/20 text-blue-100 shadow-[0_0_0_6px_rgba(59,130,246,0.15)]"
                                      style={{
                                        left: rotationHandle.x - 16,
                                        top: rotationHandle.y - 16,
                                      }}
                                    >
                                      <RotateCw className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      data-lot-object="true"
                                      onPointerDown={(event) => beginSlotResize(item.id, center, item.rotation, event)}
                                      className="absolute grid h-8 w-8 place-items-center rounded-full border border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]"
                                      style={{
                                        left: resizeHandle.x - 16,
                                        top: resizeHandle.y - 16,
                                      }}
                                    >
                                      <Move className="h-4 w-4" />
                                    </button>
                                  </>
                                );
                              })()}
                            </>
                          ) : null}
                        </>
                      );
                    }

                    if (item.type === 'arrow') {
                      const selected = isSelected(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-lot-object="true"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectItem(item.id, event.shiftKey || event.ctrlKey || event.metaKey);
                          }}
                          onPointerDown={(event) => beginItemMove(item.id, event)}
                          className={`absolute flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 ${
                            selected ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.18)]' : ''
                          }`}
                          style={{
                            left: item.x,
                            top: item.y,
                            transform: `rotate(${item.rotation}deg)`,
                            cursor: canvasDrag?.mode === 'move-item' && canvasDrag.itemId === item.id ? 'grabbing' : 'grab',
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    }

                    const selected = isSelected(item.id);
                    const Icon = item.type === 'entry' ? LogIn : item.type === 'exit' ? LogOut : MapPin;

                    return (
                      <>
                        <button
                          key={item.id}
                          ref={(element) => {
                            nodeRefs.current[item.id] = element;
                          }}
                          type="button"
                          data-lot-object="true"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectItem(item.id, event.shiftKey || event.ctrlKey || event.metaKey);
                          }}
                          onPointerDown={(event) => beginItemMove(item.id, event)}
                          className={`absolute flex items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-sm font-medium shadow-sm ${getNodeColors(
                            item.type,
                          )} ${selected ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.18)]' : ''}`}
                          style={{
                            left: item.x,
                            top: item.y,
                            width: NODE_FALLBACK_WIDTH,
                            height: NODE_FALLBACK_HEIGHT,
                            transform: `rotate(${item.rotation}deg)`,
                            cursor: canvasDrag?.mode === 'move-item' && canvasDrag.itemId === item.id ? 'grabbing' : 'grab',
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                        {selected ? (
                          <button
                            type="button"
                            data-lot-object="true"
                            onPointerDown={(event) => beginRotateItem(item.id, getNodeCenter(item), event)}
                            className="absolute grid h-8 w-8 place-items-center rounded-full border border-blue-300 bg-blue-500/20 text-blue-100 shadow-[0_0_0_6px_rgba(59,130,246,0.15)]"
                            style={{
                              left: item.x + NODE_FALLBACK_WIDTH / 2 - 16,
                              top: item.y - 36,
                            }}
                          >
                            <RotateCw className="h-4 w-4" />
                          </button>
                        ) : null}
                      </>
                    );
                  })}
                </div>

                {selectionMarquee ? (
                  <div
                    className="pointer-events-none absolute border border-primary bg-primary/10"
                    style={{
                      left: Math.min(selectionMarquee.start.x, selectionMarquee.current.x) * zoom + pan.x,
                      top: Math.min(selectionMarquee.start.y, selectionMarquee.current.y) * zoom + pan.y,
                      width: Math.abs(selectionMarquee.current.x - selectionMarquee.start.x) * zoom,
                      height: Math.abs(selectionMarquee.current.y - selectionMarquee.start.y) * zoom,
                    }}
                  />
                ) : null}

                <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
                  Drag the background to pan. Shift-drag empty space for marquee selection. Drop palette items here.
                </div>
              </div>
            </CardContent>
          </Card>

          <div
            className={`space-y-6 xl:block ${
              mobileInspectorOpen
                ? 'fixed inset-y-0 right-0 z-50 w-[min(92vw,420px)] overflow-y-auto p-4'
                : 'pointer-events-none fixed inset-y-0 right-0 z-50 w-[min(92vw,420px)] translate-x-full overflow-y-auto p-4 xl:pointer-events-auto xl:translate-x-0'
            } xl:static xl:w-auto xl:overflow-visible xl:p-0`}
          >
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base text-foreground">Inspector</CardTitle>
                    <CardDescription>
                      {selectedItem ? 'Adjust the selected object.' : 'Select an object to edit it.'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-border xl:hidden"
                      onClick={() => setMobileInspectorOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {selectedItem ? (
                      <Button variant="destructive" size="sm" onClick={removeSelected}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedItem ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Label</label>
                      <Input
                        value={selectedItem.label}
                        onChange={(event) => updateItem(selectedItem.id, { label: event.target.value } as Partial<DraftItem>)}
                        className="border-border bg-input"
                      />
                    </div>

                    {'status' in selectedItem ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Slot Status</label>
                        <select
                          value={selectedItem.status}
                          onChange={(event) =>
                            updateItem(selectedItem.id, {
                              status: event.target.value as ParkingSlotStatus,
                            } as Partial<DraftItem>)
                          }
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
                        >
                          <option value="available">available</option>
                          <option value="reserved">reserved</option>
                          <option value="occupied">occupied</option>
                          <option value="blocked">blocked</option>
                          <option value="disputed">disputed</option>
                        </select>
                      </div>
                    ) : null}

                    {selectedItem.type === 'slot' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Slot Width</label>
                          <DeferredNumberInput
                            value={Math.round(selectedItem.width)}
                            onCommit={(value) =>
                              updateItem(selectedItem.id, {
                                width: Math.max(MIN_SLOT_WIDTH, value),
                              } as Partial<DraftItem>)
                            }
                            className="border-border bg-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Slot Length</label>
                          <DeferredNumberInput
                            value={Math.round(selectedItem.height)}
                            onCommit={(value) =>
                              updateItem(selectedItem.id, {
                                height: Math.max(MIN_SLOT_HEIGHT, value),
                              } as Partial<DraftItem>)
                            }
                            className="border-border bg-input"
                          />
                        </div>
                      </div>
                    ) : null}

                    {'direction' in selectedItem ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Gate Type
                          </label>
                          <select
                            value={selectedItem.type}
                            onChange={(event) =>
                              updateItem(selectedItem.id, {
                                type: event.target.value as Extract<ParkingMapNodeKind, 'entry' | 'exit' | 'junction'>,
                              } as Partial<DraftItem>)
                            }
                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
                          >
                            <option value="entry">entry gate</option>
                            <option value="exit">exit gate</option>
                            <option value="junction">custom access gate</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {selectedItem.type === 'junction' ? 'Marker Direction' : 'Gate Direction'}
                          </label>
                          <select
                            value={selectedItem.direction}
                            onChange={(event) =>
                              updateItem(selectedItem.id, {
                                direction: event.target.value as ParkingMapArrowDirection,
                              } as Partial<DraftItem>)
                            }
                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
                          >
                            {DIRECTION_OPTIONS.map((direction) => (
                              <option key={direction} value={direction}>
                                {direction}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {selectedItem.type === 'road' ? 'Bounds X' : 'X'}
                        </label>
                        <DeferredNumberInput
                          value={
                            selectedItem.type === 'road'
                              ? Math.round(getRoadBounds(selectedItem.points).minX)
                              : Math.round(selectedItem.x)
                          }
                          onCommit={(event) =>
                            updateItem(selectedItem.id, {
                              x: snapValue(event),
                            } as Partial<DraftItem>)
                          }
                          className="border-border bg-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {selectedItem.type === 'road' ? 'Bounds Y' : 'Y'}
                        </label>
                        <DeferredNumberInput
                          value={
                            selectedItem.type === 'road'
                              ? Math.round(getRoadBounds(selectedItem.points).minY)
                              : Math.round(selectedItem.y)
                          }
                          onCommit={(event) =>
                            updateItem(selectedItem.id, {
                              y: snapValue(event),
                            } as Partial<DraftItem>)
                          }
                          className="border-border bg-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Rotation</label>
                      <DeferredNumberInput
                        value={Math.round(selectedItem.rotation)}
                        onCommit={(event) =>
                          updateItem(selectedItem.id, {
                            rotation: event,
                          } as Partial<DraftItem>)
                        }
                        className="border-border bg-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="border-border"
                        onClick={() =>
                          updateItem(selectedItem.id, {
                            rotation: selectedItem.rotation - 90,
                          } as Partial<DraftItem>)
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                        Left 90 deg
                      </Button>
                      <Button
                        variant="outline"
                        className="border-border"
                        onClick={() =>
                          updateItem(selectedItem.id, {
                            rotation: selectedItem.rotation + 90,
                          } as Partial<DraftItem>)
                        }
                      >
                        <RotateCw className="h-4 w-4" />
                        Right 90 deg
                      </Button>
                    </div>

                    {selectedItem.type === 'road' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Road Type</label>
                          <select
                            value={selectedItem.roadKind}
                            onChange={(event) =>
                              updateItem(selectedItem.id, {
                                roadKind: event.target.value as 'straight' | 'curve',
                              } as Partial<DraftItem>)
                            }
                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
                          >
                            <option value="straight">straight</option>
                            <option value="curve">curve</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                              {selectedItem.roadKind === 'straight' ? 'Length' : 'Span X'}
                            </label>
                            <DeferredNumberInput
                              value={Math.round(selectedItem.width)}
                              onCommit={(event) =>
                                updateItem(selectedItem.id, {
                                  width: Math.max(80, event),
                                } as Partial<DraftItem>)
                              }
                              className="border-border bg-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Road Width</label>
                            <DeferredNumberInput
                              value={Math.round(selectedItem.height)}
                              onCommit={(event) =>
                                updateItem(selectedItem.id, {
                                  height: Math.max(48, event),
                                } as Partial<DraftItem>)
                              }
                              className="border-border bg-input"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="border-border"
                            onClick={() =>
                              updateItem(selectedItem.id, {
                                width: selectedItem.width + 80,
                              } as Partial<DraftItem>)
                            }
                          >
                            <Plus className="h-4 w-4" />
                            Extend
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border"
                            onClick={() =>
                              updateItem(selectedItem.id, {
                                width: Math.max(80, selectedItem.width - 80),
                              } as Partial<DraftItem>)
                            }
                          >
                            <Minus className="h-4 w-4" />
                            Shorten
                          </Button>
                        </div>

                        <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-foreground">Road Points</div>
                              <div className="text-xs text-muted-foreground">
                                Start and end points snap to nearby roads and gate markers when released.
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border"
                              onClick={() =>
                                setItems((current) =>
                                  current.map((item) => {
                                    if (item.id !== selectedItem.id || item.type !== 'road') {
                                      return item;
                                    }

                                    const anchorA = item.points[Math.max(0, item.points.length - 2)] ?? { x: item.x, y: item.y };
                                    const anchorB = item.points[item.points.length - 1] ?? { x: item.x + item.width, y: item.y };
                                    const inserted = [
                                      ...item.points.slice(0, -1),
                                      {
                                        x: snapValue((anchorA.x + anchorB.x) / 2),
                                        y: snapValue((anchorA.y + anchorB.y) / 2 - 48),
                                      },
                                      anchorB,
                                    ];

                                    return syncRoadFromPoints({ ...item, points: inserted });
                                  }),
                                )
                              }
                            >
                              <Plus className="h-4 w-4" />
                              Bend Point
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {selectedItem.points.map((point, pointIndex) => {
                              const isStart = pointIndex === 0;
                              const isEnd = pointIndex === selectedItem.points.length - 1;
                              const isBend = !isStart && !isEnd;

                              return (
                                <div key={`${selectedItem.id}-point-row-${pointIndex}`} className="rounded-lg border border-border bg-background/60 p-3">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                      {isStart ? 'Start' : isEnd ? 'End' : `Bend ${pointIndex}`}
                                    </div>
                                    {isBend ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-destructive/40 text-destructive"
                                        onClick={() =>
                                          setItems((current) =>
                                            current.map((item) => {
                                              if (item.id !== selectedItem.id || item.type !== 'road') {
                                                return item;
                                              }

                                              return syncRoadFromPoints({
                                                ...item,
                                                points: removeRoadPoint(item.points, pointIndex),
                                              });
                                            }),
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Remove
                                      </Button>
                                    ) : null}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <DeferredNumberInput
                                      value={Math.round(point.x)}
                                      onCommit={(event) =>
                                        updateRoadPoint(selectedItem.id, pointIndex, {
                                          x: event,
                                        })
                                      }
                                      className="border-border bg-input"
                                    />
                                    <DeferredNumberInput
                                      value={Math.round(point.y)}
                                      onCommit={(event) =>
                                        updateRoadPoint(selectedItem.id, pointIndex, {
                                          y: event,
                                        })
                                      }
                                      className="border-border bg-input"
                                    />
                                  </div>

                                  {isStart || isEnd ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-3 w-full border-border"
                                      onClick={() =>
                                        setItems((current) =>
                                          current.map((item) => {
                                            if (item.id !== selectedItem.id || item.type !== 'road') {
                                              return item;
                                            }

                                            return connectRoadEndpointToNearest(
                                              item,
                                              selectedItem.id,
                                              pointIndex,
                                              current
                                                .filter((entry): entry is Extract<DraftItem, { type: 'road' }> => entry.type === 'road')
                                                .map((road) => ({ id: road.id, points: road.points })),
                                            );
                                          }),
                                        )
                                      }
                                    >
                                      Snap {isStart ? 'Start' : 'End'} to Nearest Road
                                    </Button>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {selectedItem.type === 'arrow' ? (
                      <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                        Use arrows for one-way guidance, turn hints, or pedestrian direction markers.
                      </div>
                    ) : null}

                    {selectedItem.type === 'junction' ? (
                      <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
                        Rename this marker for mall entrances, elevators, ramps, or other access points.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                    Select a slot, gate, road, or marker on the canvas to edit it here.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Layout Summary</CardTitle>
                <CardDescription>Quick totals for the current map draft.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Slots</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{stats.slots}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Roads</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{stats.roads}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Gates</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{stats.gates}</div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Markers</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{stats.markers}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
