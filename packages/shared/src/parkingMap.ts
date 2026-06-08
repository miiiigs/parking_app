export type ParkingSlotStatus = 'available' | 'reserved' | 'occupied' | 'blocked' | 'disputed';

export type ParkingMapRoadKind = 'straight' | 'curve';
export type ParkingMapNodeKind = 'entry' | 'exit' | 'junction';
export type ParkingMapArrowDirection = 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';

export type ParkingMapPoint = {
  x: number;
  y: number;
};

export type ParkingMapRoad = {
  id: string;
  kind: ParkingMapRoadKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  direction?: ParkingMapArrowDirection;
  points?: ParkingMapPoint[];
};

export type ParkingRoadShape = {
  d: string;
  strokeWidth: number;
  anchors: Array<{ x: number; y: number }>;
  labelX: number;
  labelY: number;
  bendHandles: ParkingMapPoint[];
};

export type ParkingMapSlot = {
  id: string;
  label: string;
  status: ParkingSlotStatus;
  displayOrder: number;
  x: number;
  y: number;
  rotation: number;
  width?: number;
  height?: number;
};

export type ParkingMapNode = {
  id: string;
  kind: ParkingMapNodeKind;
  label: string;
  x: number;
  y: number;
  direction?: ParkingMapArrowDirection;
};

export type ParkingMapArrow = {
  id: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
};

export type ParkingLotDefinition = {
  id: string;
  name: string;
  width: number;
  height: number;
  roads: ParkingMapRoad[];
  slots: ParkingMapSlot[];
  nodes: ParkingMapNode[];
  arrows: ParkingMapArrow[];
};

export type ParkingSlotSource = {
  id: string;
  slotLabel: string;
  status: ParkingSlotStatus;
  displayOrder: number;
};

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 900;
const SLOT_WIDTH = 92;
const SLOT_HEIGHT = 76;
const SLOT_GAP = 14;
const ROW_GAP = 18;
const SIDE_PADDING = 60;
const LEFT_COLUMNS = 3;
const COLUMNS_PER_ROW = 6;

export function resolveRoadPoints(road: ParkingMapRoad): ParkingMapPoint[] {
  if (road.points && road.points.length >= 2) {
    return road.points;
  }

  const start = { x: road.x, y: road.y + road.height / 2 };
  const end = { x: road.x + road.width, y: road.y + road.height / 2 };

  if (road.kind === 'curve') {
    const lift = Math.max(40, road.height * 0.55);
    return [
      start,
      { x: road.x + road.width * 0.28, y: road.y + road.height / 2 - lift },
      { x: road.x + road.width * 0.72, y: road.y + road.height / 2 + lift * 0.15 },
      end,
    ];
  }

  return [start, end];
}

function rotatePoint(point: ParkingMapPoint, center: ParkingMapPoint, rotation: number): ParkingMapPoint {
  if (!rotation) {
    return point;
  }

  const radians = (rotation * Math.PI) / 180;
  const offsetX = point.x - center.x;
  const offsetY = point.y - center.y;

  return {
    x: center.x + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: center.y + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };
}

/** Rotate an array of road points around the first point (start).
 * This mutates the logical geometry so rotation becomes part of the points themselves.
 */
export function rotateRoadPoints(points: ParkingMapPoint[], angleDegrees: number): ParkingMapPoint[] {
  if (!points || points.length < 2) return points;

  const radians = (angleDegrees * Math.PI) / 180;
  const start = points[0];

  return points.map((point) => {
    const dx = point.x - start.x;
    const dy = point.y - start.y;

    return {
      x: start.x + dx * Math.cos(radians) - dy * Math.sin(radians),
      y: start.y + dx * Math.sin(radians) + dy * Math.cos(radians),
    };
  });
}

function buildPolylinePath(points: ParkingMapPoint[]): string {
  return points.reduce(
    (path, point, index) => `${path}${index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`}`,
    '',
  );
}

/** Smooth cubic-bezier path through bend points (Catmull–Rom style). */
function buildSmoothCurvePath(points: ParkingMapPoint[]): string {
  if (points.length < 2) {
    return '';
  }

  if (points.length === 2) {
    return buildPolylinePath(points);
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = index === 0 ? points[0] : points[index - 1];
    const start = points[index];
    const end = points[index + 1];
    const next = index + 2 < points.length ? points[index + 2] : points[index + 1];
    const control1X = start.x + (end.x - previous.x) / 6;
    const control1Y = start.y + (end.y - previous.y) / 6;
    const control2X = end.x - (next.x - start.x) / 6;
    const control2Y = end.y - (next.y - start.y) / 6;
    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${end.x} ${end.y}`;
  }

  return path;
}

export function createEmptyParkingLotDefinition(name = 'New Parking Lot'): ParkingLotDefinition {
  return {
    id: 'parking-lot-draft',
    name,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    roads: [],
    slots: [],
    nodes: [
      {
        id: 'entry-node',
        kind: 'entry',
        label: 'Entry Gate',
        x: Math.round(DEFAULT_WIDTH / 2),
        y: 800,
        direction: 'east',
      },
    ],
    arrows: [],
  };
}

export function buildParkingLotDefinitionFromSlots(slots: ParkingSlotSource[], name = 'BGC Pilot Site'): ParkingLotDefinition {
  const rows = Math.max(1, Math.ceil(slots.length / COLUMNS_PER_ROW));
  const slotBlockWidth = LEFT_COLUMNS * SLOT_WIDTH + (LEFT_COLUMNS - 1) * SLOT_GAP;
  const rightBlockStart = DEFAULT_WIDTH - SIDE_PADDING - slotBlockWidth;
  const leftBlockStart = SIDE_PADDING;

  const positionedSlots = slots.map((slot, index) => {
    const rowIndex = Math.floor(index / COLUMNS_PER_ROW);
    const columnIndex = index % COLUMNS_PER_ROW;
    const rowProgress = rows > 1 ? rowIndex / (rows - 1) : 0;
    const curveOffset = Math.sin(rowProgress * Math.PI) * 24;
    const isLeftSide = columnIndex < LEFT_COLUMNS;
    const x = isLeftSide
      ? leftBlockStart + columnIndex * (SLOT_WIDTH + SLOT_GAP) + curveOffset * 0.12
      : rightBlockStart + (columnIndex - LEFT_COLUMNS) * (SLOT_WIDTH + SLOT_GAP) - curveOffset * 0.12;
    const y = 150 + rowIndex * (SLOT_HEIGHT + ROW_GAP) + Math.sin((rowProgress * Math.PI) / 2) * 12;

    return {
      id: slot.id,
      label: slot.slotLabel,
      status: slot.status,
      displayOrder: slot.displayOrder,
      x,
      y,
      rotation: isLeftSide ? -7 : 7,
      width: SLOT_WIDTH,
      height: SLOT_HEIGHT,
    };
  });

  return {
    ...createEmptyParkingLotDefinition(name),
    slots: positionedSlots,
    roads: [
      {
        id: 'entry-road',
        kind: 'straight',
        label: 'Entry Drive',
        x: 56,
        y: 42,
        width: 1168,
        height: 68,
        direction: 'east',
      },
      {
        id: 'lot-loop',
        kind: 'curve',
        label: 'Parking Loop',
        x: 336,
        y: 182,
        width: 596,
        height: 220,
        direction: 'south-east',
        points: [
          { x: 336, y: 292 },
          { x: 468, y: 230 },
          { x: 602, y: 326 },
          { x: 742, y: 246 },
          { x: 932, y: 292 },
        ],
      },
      {
        id: 'exit-road',
        kind: 'straight',
        label: 'Exit Drive',
        x: 972,
        y: 42,
        width: 252,
        height: 68,
        direction: 'west',
      },
    ],
  };
}

export function applyLiveSlotStatuses(
  lot: ParkingLotDefinition,
  liveSlots: Array<{ id: string; label: string; status: ParkingSlotStatus; displayOrder: number }>,
): ParkingLotDefinition {
  const mergedSlots = lot.slots.map((slot) => {
    const live =
      liveSlots.find((entry) => entry.id === slot.id) ??
      liveSlots.find((entry) => entry.label.toLowerCase() === slot.label.toLowerCase());

    if (!live) {
      return slot;
    }

    return {
      ...slot,
      id: live.id,
      label: live.label,
      status: live.status,
      displayOrder: live.displayOrder,
    };
  });

  const knownIds = new Set(mergedSlots.map((slot) => slot.id));
  const extraSlots = liveSlots
    .filter((live) => !knownIds.has(live.id))
    .map((live, index) => ({
      id: live.id,
      label: live.label,
      status: live.status,
      displayOrder: live.displayOrder,
      x: 120 + (index % 4) * 110,
      y: 180 + Math.floor(index / 4) * 100,
      rotation: 0,
      width: SLOT_WIDTH,
      height: SLOT_HEIGHT,
    }));

  return {
    ...lot,
    slots: [...mergedSlots, ...extraSlots],
  };
}

export function buildRoadShape(road: ParkingMapRoad): ParkingRoadShape {
  // Use the resolved points directly. Rotation of straight roads should update
  // the points themselves so rendering is based on the true geometry.
  const originalPoints = resolveRoadPoints(road);
  const points = originalPoints;
  const strokeWidth = Math.max(42, Math.min(road.height, road.width) * 0.22);
  const d =
    road.kind === 'curve' && points.length > 2 ? buildSmoothCurvePath(points) : buildPolylinePath(points);

  return {
    d,
    strokeWidth,
    anchors: [points[0], points[points.length - 1]],
    labelX: points[Math.floor(points.length / 2)].x,
    labelY: points[Math.floor(points.length / 2)].y - 22,
    // Expose raw bend handles (these are already part of the canonical geometry)
    bendHandles: originalPoints.slice(1, -1),
  };
}
