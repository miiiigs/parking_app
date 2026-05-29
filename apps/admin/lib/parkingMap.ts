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

function createRoadPoints(road: ParkingMapRoad): ParkingMapPoint[] {
  if (road.points && road.points.length >= 2) {
    return road.points;
  }

  const start = { x: road.x, y: road.y + road.height / 2 };
  const end = { x: road.x + road.width, y: road.y + road.height / 2 };

  if (road.kind === 'curve') {
    const midX = road.x + road.width / 2;
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

export function createEmptyParkingLotDefinition(name = 'New Parking Lot'): ParkingLotDefinition {
  return {
    id: 'parking-lot-draft',
    name,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    // Start with only an entry gate node by default — other objects are added by the builder
    roads: [],
    slots: [],
    nodes: [
      {
        id: 'entry-node',
        kind: 'entry',
        label: 'Entry Gate',
        x: Math.round(DEFAULT_WIDTH / 2),
        y: 64,
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

export function buildRoadShape(road: ParkingMapRoad): ParkingRoadShape {
  const originalPoints = createRoadPoints(road);
  const center = {
    x: originalPoints.reduce((sum, point) => sum + point.x, 0) / originalPoints.length,
    y: originalPoints.reduce((sum, point) => sum + point.y, 0) / originalPoints.length,
  };
  const points = originalPoints.map((point) => rotatePoint(point, center, road.rotation ?? 0));
  const strokeWidth = Math.max(42, Math.min(road.height, road.width) * 0.22);
  const d = points.reduce((path, point, index) => `${path}${index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`}`, '');

  return {
    d,
    strokeWidth,
    anchors: [points[0], points[points.length - 1]],
    labelX: points[Math.floor(points.length / 2)].x,
    labelY: points[Math.floor(points.length / 2)].y - 22,
    bendHandles: points.slice(1, -1),
  };
}