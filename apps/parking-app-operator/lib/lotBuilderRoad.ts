import type { ParkingMapPoint } from './parkingMap';

export const ROAD_SNAP_DISTANCE = 30;

export type RoadDraftGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  points: ParkingMapPoint[];
  roadKind: 'straight' | 'curve';
  rotation?: number;
};

export function getRoadBounds(points: ParkingMapPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function getRoadLength(points: ParkingMapPoint[]) {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
  }

  return total;
}

export function syncRoadFromPoints<T extends RoadDraftGeometry>(road: T): T {
  const bounds = getRoadBounds(road.points);

  let rotation = road.rotation ?? 0;
  if (road.points.length >= 2) {
    const start = road.points[0];
    const end = road.points[road.points.length - 1];
    rotation = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  }

  const derivedWidth =
    road.roadKind === 'straight'
      ? Math.max(80, getRoadLength(road.points))
      : Math.max(80, bounds.maxX - bounds.minX);
  const preservedHeight = Math.max(48, road.height);

  return {
    ...road,
    x: bounds.minX,
    y: bounds.minY,
    width: derivedWidth,
    height: preservedHeight,
    rotation,
  } as T;
}

export function translateRoadPoints<T extends RoadDraftGeometry>(road: T, deltaX: number, deltaY: number): T {
  return syncRoadFromPoints({
    ...road,
    points: road.points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })),
  });
}

export function moveRoadToOrigin<T extends RoadDraftGeometry>(road: T, nextX: number, nextY: number): T {
  const bounds = getRoadBounds(road.points);
  return translateRoadPoints(road, nextX - bounds.minX, nextY - bounds.minY);
}

export function snapPoint(point: ParkingMapPoint, targets: ParkingMapPoint[], distance = ROAD_SNAP_DISTANCE): ParkingMapPoint {
  let closest: ParkingMapPoint | null = null;
  let closestDistance = distance;

  for (const target of targets) {
    const gap = Math.hypot(target.x - point.x, target.y - point.y);
    if (gap <= closestDistance) {
      closest = target;
      closestDistance = gap;
    }
  }

  return closest ? { x: closest.x, y: closest.y } : point;
}

export function setRoadPoint<T extends RoadDraftGeometry>(
  road: T,
  pointIndex: number,
  position: ParkingMapPoint,
  snapTargets: ParkingMapPoint[] = [],
): T {
  const snapped = snapPoint(position, snapTargets);
  const points = road.points.map((point, index) => (index === pointIndex ? snapped : point));

  return syncRoadFromPoints({ ...road, points });
}

export function extendStraightRoadEnd<T extends RoadDraftGeometry>(road: T, nextWidth: number): T {
  if (road.roadKind !== 'straight' || road.points.length < 2) {
    return syncRoadFromPoints({ ...road, width: Math.max(80, nextWidth) });
  }

  const start = road.points[0];
  const end = road.points[road.points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const unitX = dx / length;
  const unitY = dy / length;
  const targetLength = Math.max(80, nextWidth);
  const points = [...road.points];

  points[points.length - 1] = {
    x: start.x + unitX * targetLength,
    y: start.y + unitY * targetLength,
  };

  return syncRoadFromPoints({ ...road, points });
}

export function collectRoadEndpointTargets(
  roads: Array<{ id: string; points: ParkingMapPoint[] }>,
  excludeRoadId?: string,
  excludePointIndex?: number,
): ParkingMapPoint[] {
  const targets: ParkingMapPoint[] = [];

  for (const road of roads) {
    if (road.points.length < 2) {
      continue;
    }

    const start = road.points[0];
    const end = road.points[road.points.length - 1];

    if (!(road.id === excludeRoadId && excludePointIndex === 0)) {
      targets.push(start);
    }

    if (!(road.id === excludeRoadId && excludePointIndex === road.points.length - 1)) {
      targets.push(end);
    }
  }

  return targets;
}

export function connectRoadEndpointToNearest<T extends RoadDraftGeometry>(
  road: T,
  roadId: string,
  pointIndex: number,
  roads: Array<{ id: string; points: ParkingMapPoint[] }>,
): T {
  const point = road.points[pointIndex];
  if (!point) {
    return road;
  }

  const targets = collectRoadEndpointTargets(roads, roadId, pointIndex);
  const snapped = snapPoint(point, targets, ROAD_SNAP_DISTANCE * 2);

  if (snapped.x === point.x && snapped.y === point.y) {
    return road;
  }

  return setRoadPoint(road, pointIndex, snapped, []);
}
