import type { ParkingMapPoint } from './parkingMap';

export const ROAD_SNAP_DISTANCE = 22;

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

export function syncRoadFromPoints<T extends RoadDraftGeometry>(road: T): T {
  const bounds = getRoadBounds(road.points);

  // Derive rotation from the geometry: straight roads' rotation is the
  // angle from the first point to the last point.
  let rotation = road.rotation ?? 0;
  if (road.points && road.points.length >= 2) {
    const start = road.points[0];
    const end = road.points[road.points.length - 1];
    rotation = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  }

  return {
    ...road,
    x: bounds.minX,
    y: bounds.minY,
    width: Math.max(80, bounds.maxX - bounds.minX),
    height: Math.max(48, bounds.maxY - bounds.minY),
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
