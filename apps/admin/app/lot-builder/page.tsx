'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';

import {
  buildRoadShape,
  createEmptyParkingLotDefinition,
  type ParkingMapPoint,
  type ParkingLotDefinition,
  type ParkingSlotStatus,
  type ParkingMapArrowDirection,
} from '../../lib/parkingMap';
import { loadLotBuilderState, saveLotBuilderLayout } from '../actions';
import {
  collectRoadEndpointTargets,
  connectRoadEndpointToNearest,
  extendStraightRoadEnd,
  getRoadBounds,
  moveRoadToOrigin,
  setRoadPoint,
  syncRoadFromPoints,
  translateRoadPoints,
} from '../../lib/lotBuilderRoad';
import { lotDefinitionToDraftItems } from '../../lib/parkingLotLayout';

type DraftItemType = 'slot' | 'road-straight' | 'road-curve' | 'entry' | 'exit' | 'arrow';

type DraftItem =
  | { id: string; type: 'slot'; label: string; status: ParkingSlotStatus; x: number; y: number; rotation: number }
  | { id: string; type: 'road'; label: string; x: number; y: number; width: number; height: number; rotation: number; points: ParkingMapPoint[]; roadKind: 'straight' | 'curve' }
  | { id: string; type: 'entry' | 'exit'; label: string; x: number; y: number; rotation: number; direction: ParkingMapArrowDirection }
  | { id: string; type: 'arrow'; label: string; x: number; y: number; rotation: number };

function cloneItem(item: DraftItem): DraftItem {
  return JSON.parse(JSON.stringify(item)) as DraftItem;
}

type CanvasDrag =
  | {
      mode: 'road-move';
      roadId: string;
      pointerStart: ParkingMapPoint;
      originPoints: ParkingMapPoint[];
    }
  | {
      mode: 'road-point';
      roadId: string;
      pointIndex: number;
    };

function removeRoadPoint(points: ParkingMapPoint[], pointIndex: number) {
  if (points.length <= 2) {
    return points;
  }

  return points.filter((_, index) => index !== pointIndex);
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function itemToLabel(type: DraftItemType) {
  if (type === 'road-straight') return 'Straight Road';
  if (type === 'road-curve') return 'Curve Road';
  if (type === 'entry') return 'Entry';
  if (type === 'exit') return 'Exit';
  if (type === 'arrow') return 'Direction';
  return 'Slot';
}

function createDraftItem(type: DraftItemType, id: string, x: number, y: number): DraftItem {
  if (type === 'slot') {
    return { id, type, label: 'New Slot', status: 'available', x, y, rotation: -7 };
  }

  if (type === 'road-straight') {
    return syncRoadFromPoints({
      id,
      type: 'road' as const,
      roadKind: 'straight' as const,
      label: 'Road',
      x,
      y,
      width: 300,
      height: 64,
      rotation: 0,
      points: [
        { x, y },
        { x: x + 300, y },
      ],
    });
  }

  if (type === 'road-curve') {
    return syncRoadFromPoints({
      id,
      type: 'road' as const,
      roadKind: 'curve' as const,
      label: 'Road',
      x,
      y,
      width: 360,
      height: 220,
      rotation: 0,
      points: [
        { x, y: y + 90 },
        { x: x + 110, y: y + 25 },
        { x: x + 220, y: y + 140 },
        { x: x + 360, y: y + 90 },
      ],
    });
  }

  if (type === 'entry') {
    return { id, type, label: 'Entry Gate', x, y, rotation: 0, direction: 'east' };
  }

  if (type === 'exit') {
    return { id, type, label: 'Exit Gate', x, y, rotation: 0, direction: 'west' };
  }

  return { id, type, label: 'Direction', x, y, rotation: 0 };
}

const palette: Array<{ type: DraftItemType; description: string }> = [
  { type: 'slot', description: 'Parking bay with status and rotation' },
  { type: 'road-straight', description: 'Straight driveway or lane segment' },
  { type: 'road-curve', description: 'Curve or loop segment' },
  { type: 'entry', description: 'Entry gate / node' },
  { type: 'exit', description: 'Exit gate / node' },
  { type: 'arrow', description: 'Direction arrow for traffic flow' },
];

export default function LotBuilderPage() {
  const [lotName, setLotName] = useState('BGC Pilot Site');
  const [items, setItems] = useState<DraftItem[]>(() => {
    const base = createEmptyParkingLotDefinition('BGC Pilot Site');
    const entry = base.nodes.find((n) => n.kind === 'entry');
    if (!entry) return [];

    const entryItem: DraftItem = { id: entry.id, type: 'entry', label: entry.label, x: entry.x, y: entry.y, rotation: 0, direction: entry.direction ?? 'east' };
    return [entryItem];
  });
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0 });
  const [canvasDrag, setCanvasDrag] = useState<CanvasDrag | null>(null);
  const canvasDragRef = useRef<CanvasDrag | null>(null);

  function setCanvasDragState(next: CanvasDrag | null) {
    canvasDragRef.current = next;
    setCanvasDrag(next);
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

  const roadItems = useMemo(
    () => items.filter((item): item is Extract<DraftItem, { type: 'road' }> => item.type === 'road'),
    [items],
  );

  function setPanState(next: { x: number; y: number }) {
    panRef.current = next;
    setPan(next);
  }

  function setZoomState(next: number) {
    const clamped = Math.min(1.8, Math.max(0.7, next));
    zoomRef.current = clamped;
    setZoom(clamped);
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
    const previousZoom = zoomRef.current;
    const clamped = Math.min(1.8, Math.max(0.7, nextZoom));
    const lotX = (screenX - panRef.current.x) / previousZoom;
    const lotY = (screenY - panRef.current.y) / previousZoom;

    setZoomState(clamped);
    setPanState({
      x: screenX - lotX * clamped,
      y: screenY - lotY * clamped,
    });
  }

  function zoomIn() {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    zoomAt((rect?.left ?? 0) + (rect?.width ?? 0) / 2, (rect?.top ?? 0) + (rect?.height ?? 0) / 2, zoomRef.current + 0.15);
  }

  function zoomOut() {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    zoomAt((rect?.left ?? 0) + (rect?.width ?? 0) / 2, (rect?.top ?? 0) + (rect?.height ?? 0) / 2, zoomRef.current - 0.15);
  }

  function resetZoom() {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    if (!rect) {
      setZoomState(1);
      return;
    }

    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 1);
  }

  function recenterEntryGateAdmin() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const entry = createEmptyParkingLotDefinition(lotName).nodes.find((n) => n.kind === 'entry');
    if (!entry) return;

    setPanState({ x: rect.width / 2 - entry.x * zoomRef.current, y: rect.height * 0.75 - entry.y * zoomRef.current });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a, [data-lot-object]')) return;

    panStartRef.current = { clientX: e.clientX, clientY: e.clientY, startX: panRef.current.x, startY: panRef.current.y };
    setIsPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      setPanState({ x: panStartRef.current.startX + dx, y: panStartRef.current.startY + dy });
    }

    function handleUp() {
      setIsPanning(false);
    }

    if (isPanning) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
    }
  }, [isPanning]);

  useEffect(() => {
    if (!canvasDrag) {
      return;
    }

    function handleMove(event: PointerEvent) {
      const drag = canvasDragRef.current;
      if (!drag) {
        return;
      }

      const lotPoint = screenToLot(event.clientX, event.clientY);

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
                x: point.x + deltaX,
                y: point.y + deltaY,
              })),
            });
          }),
        );
        return;
      }

      const snapTargets = collectRoadEndpointTargets(
        roadItems.map((road) => ({ id: road.id, points: road.points })),
        drag.roadId,
        drag.pointIndex,
      );

      setItems((current) =>
        current.map((item) => {
          if (item.id !== drag.roadId || item.type !== 'road') {
            return item;
          }

          return setRoadPoint(item, drag.pointIndex, lotPoint, snapTargets);
        }),
      );
    }

    function handleUp() {
      const drag = canvasDragRef.current;
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

      setCanvasDragState(null);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [canvasDrag, roadItems]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSupabase() {
      try {
        const state = await loadLotBuilderState();
        if (cancelled || !state) {
          return;
        }

        setLocationId(state.locationId);
        if (state.locationName) {
          setLotName(state.locationName);
        }

        if (state.layout) {
          const draftItems = lotDefinitionToDraftItems(state.layout) as DraftItem[];
          if (draftItems.length > 0) {
            setItems(draftItems);
            setSelectedId(draftItems[0]?.id ?? null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSaveMessage(error instanceof Error ? error.message : 'Failed to load saved layout.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLayout(false);
        }
      }
    }

    hydrateFromSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingLayout || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const entry =
      items.find((item) => item.type === 'entry') ??
      createEmptyParkingLotDefinition(lotName).nodes.find((n) => n.kind === 'entry');
    if (!entry || !('x' in entry)) return;

    setPanState({
      x: rect.width / 2 - entry.x * zoomRef.current,
      y: rect.height * 0.75 - entry.y * zoomRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingLayout]);

  function resetToEntryGate() {
    const base = createEmptyParkingLotDefinition(lotName);
    const entry = base.nodes.find((n) => n.kind === 'entry');
    if (!entry) return;

    const entryItem: DraftItem = { id: entry.id, type: 'entry', label: entry.label, x: entry.x, y: entry.y, rotation: 0, direction: entry.direction ?? 'east' };
    setItems([entryItem]);
    setSelectedId(entryItem.id);
  }

  function openResetModal() {
    setShowResetModal(true);
  }

  function closeResetModal() {
    setShowResetModal(false);
  }

  const lot = useMemo<ParkingLotDefinition>(() => {
    const base = createEmptyParkingLotDefinition(lotName);
    return {
      ...base,
      name: lotName,
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
        })),
      nodes: items
        .filter((item): item is Extract<DraftItem, { type: 'entry' | 'exit' }> => item.type === 'entry' || item.type === 'exit')
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
  }, [items, lotName]);

  function addItem(type: DraftItemType) {
    const id = nextId(type);
    setItems((current) => [...current, createDraftItem(type, id, 120, 140)]);
    setSelectedId(id);
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const merged = { ...item, ...patch } as DraftItem;

        if (merged.type !== 'road') {
          return merged;
        }

        const roadItem = item as Extract<DraftItem, { type: 'road' }>;

        // If rotation is being changed for a straight road, rotate the geometry
        // by updating the endpoint based on the current length so points remain
        // the canonical geometry (rotation is derived from points).
        if ('rotation' in patch && patch.rotation !== undefined && merged.roadKind === 'straight') {
          const start = roadItem.points[0];
          const lastPoint = roadItem.points[roadItem.points.length - 1];
          const length = Math.hypot(lastPoint.x - start.x, lastPoint.y - start.y) || merged.width || 0;
          const radians = (patch.rotation * Math.PI) / 180;
          const end = {
            x: start.x + length * Math.cos(radians),
            y: start.y + length * Math.sin(radians),
          };

          return syncRoadFromPoints({
            ...merged,
            points: [start, end],
          });
        }

        if ('x' in patch || 'y' in patch) {
          return moveRoadToOrigin(merged, patch.x ?? merged.x, patch.y ?? merged.y);
        }

        if ('width' in patch && patch.width !== undefined) {
          // When changing the width (length) of a straight road, preserve
          // the current rotation and compute the new end point accordingly.
          const start = roadItem.points[0];
          const radians = ((merged.rotation ?? 0) * Math.PI) / 180;
          const end = {
            x: start.x + patch.width * Math.cos(radians),
            y: start.y + patch.width * Math.sin(radians),
          };

          return syncRoadFromPoints({
            ...merged,
            width: patch.width,
            points: [start, end],
          });
        }

        if ('points' in patch) {
          return syncRoadFromPoints(merged);
        }

        return syncRoadFromPoints(merged);
      }),
    );
  }

  function updateRoadPoint(roadId: string, pointIndex: number, patch: Partial<ParkingMapPoint>) {
    setItems((current) => {
      const roads = current
        .filter((entry): entry is Extract<DraftItem, { type: 'road' }> => entry.type === 'road')
        .map((road) => ({ id: road.id, points: road.points }));
      const snapTargets = collectRoadEndpointTargets(roads, roadId, pointIndex);

      return current.map((item) => {
        if (item.id !== roadId || item.type !== 'road') {
          return item;
        }

        const point = item.points[pointIndex];
        if (!point) {
          return item;
        }

        return setRoadPoint(item, pointIndex, { ...point, ...patch }, snapTargets);
      });
    });
  }

  function beginRoadMove(roadId: string, event: React.PointerEvent<HTMLElement>) {
    const road = items.find((item) => item.id === roadId && item.type === 'road');
    if (!road || road.type !== 'road') {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(roadId);
    setCanvasDragState({
      mode: 'road-move',
      roadId,
      pointerStart: screenToLot(event.clientX, event.clientY),
      originPoints: road.points.map((point) => ({ ...point })),
    });
  }

  function beginRoadPointDrag(roadId: string, pointIndex: number, event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(roadId);
    setCanvasDragState({ mode: 'road-point', roadId, pointIndex });
  }

  function removeSelected() {
    if (!selectedId) return;

    setItems((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }

  function onCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const payload = event.dataTransfer.getData('application/json');

    if (!payload) {
      return;
    }

    const data = JSON.parse(payload) as { type: DraftItemType; id?: string };
    const rect = event.currentTarget.getBoundingClientRect();
    // account for canvas pan transform when mapping screen -> lot coords
    const x = Math.max(20, (event.clientX - rect.left - 46 - pan.x) / zoomRef.current);
    const y = Math.max(20, (event.clientY - rect.top - 38 - pan.y) / zoomRef.current);

    if (data.id) {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== data.id) {
            return item;
          }

          if (item.type === 'road') {
            const bounds = getRoadBounds(item.points);
            const currentCenterX = (bounds.minX + bounds.maxX) / 2;
            const currentCenterY = (bounds.minY + bounds.maxY) / 2;
            return translateRoadPoints(item, x - currentCenterX, y - currentCenterY);
          }

          if (item.type === 'slot' || item.type === 'entry' || item.type === 'exit' || item.type === 'arrow') {
            return { ...cloneItem(item), x, y } as DraftItem;
          }

          return item;
        }),
      );
      setSelectedId(data.id);
      return;
    }

    const id = nextId(data.type);
    const created = createDraftItem(data.type, id, x, y);
    setItems((current) => [...current, created]);
    setSelectedId(id);
  }

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  async function handleSaveLayout() {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await saveLotBuilderLayout(JSON.stringify(lot));
      setSaveMessage(`Map saved at ${new Date(result.savedAt).toLocaleTimeString()}. Mobile loads this on refresh.`);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save map.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 12, fontWeight: 800, margin: 0 }}>Parking Lot Builder</p>
          <h1 style={{ margin: '8px 0 0', fontSize: 40, lineHeight: 1.05 }}>Drag, place, and shape your parking lot.</h1>
          <p style={{ color: '#a9bdd6', maxWidth: 780, lineHeight: 1.6 }}>
            Build your lot, then save the map to Supabase. The mobile reservation screen loads it automatically on refresh.
          </p>
          {isLoadingLayout ? <p style={{ color: '#7bd3ff', margin: '8px 0 0' }}>Loading saved map…</p> : null}
          {saveMessage ? (
            <p style={{ color: saveMessage.startsWith('Map saved') ? '#3dd6a5' : '#ff8a80', margin: '8px 0 0', maxWidth: 720 }}>{saveMessage}</p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="default" disabled={isSaving || isLoadingLayout} onClick={handleSaveLayout} className="px-5 py-3">
            {isSaving ? 'Saving map…' : 'Save map to Supabase'}
          </Button>
          <Button asChild variant="ghost" className="px-4 py-3">
            <Link href="/parking-map">View Parking Map</Link>
          </Button>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
        <aside style={{ ...panelStyle, display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Lot name</label>
            <input value={lotName} onChange={(event) => setLotName(event.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ ...labelStyle, marginBottom: 2 }}>Palette</div>
            {palette.map((entry) => (
              <button
                key={entry.type}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/json', JSON.stringify({ type: entry.type }));
                }}
                onClick={() => addItem(entry.type)}
                style={paletteButtonStyle}
              >
                <strong>{itemToLabel(entry.type)}</strong>
                <span style={{ color: '#a9bdd6', fontSize: 12, lineHeight: 1.4 }}>{entry.description}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={labelStyle}>How it works</div>
            <div style={helperBoxStyle}>
              Drag palette items onto the canvas. Drag a road body to move it; drag green (S/E) or blue (bend) handles to extend and snap endpoints to other roads within ~22px.
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <Button variant="default" disabled={isSaving || isLoadingLayout} onClick={handleSaveLayout} className="w-full text-center">
              {isSaving ? 'Saving…' : 'Save map to Supabase'}
            </Button>
            <Button variant="ghost" onClick={openResetModal} className="w-full">
              Reset to entry gate
            </Button>
            {locationId ? <p style={{ color: '#7f94ad', fontSize: 11, margin: 0 }}>Location: {locationId.slice(0, 8)}…</p> : null}
          </div>
        </aside>

        <div style={{ ...panelStyle, minWidth: 0 }}>
          <div
            onPointerDown={handlePointerDown}
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY < 0 ? 0.12 : -0.12;
              zoomAt(event.clientX, event.clientY, zoomRef.current + delta);
            }}
            onDragOver={(event) => { event.preventDefault(); }}
            onDrop={onCanvasDrop}
            style={{
              position: 'relative',
              minHeight: 760,
              overflow: 'hidden',
              borderRadius: 24,
              background: '#08111d',
              border: '1px solid #1a2c43',
              touchAction: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.24,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 16,
                right: 16,
                color: '#7bd3ff',
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                pointerEvents: 'auto',
                zIndex: 10,
              }}
            >
              <span style={{ pointerEvents: 'none' }}>Canvas</span>
              <div style={{ display: 'flex', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
                <button type="button" onClick={zoomOut} style={{ ...paletteButtonStyle, width: 'auto', padding: '8px 10px' }}>
                  -
                </button>
                <button type="button" onClick={resetZoom} style={{ ...paletteButtonStyle, width: 'auto', padding: '8px 10px' }}>
                  {Math.round(zoom * 100)}%
                </button>
                <button type="button" onClick={zoomIn} style={{ ...paletteButtonStyle, width: 'auto', padding: '8px 10px' }}>
                  +
                </button>
                <button type="button" onClick={recenterEntryGateAdmin} style={{ ...paletteButtonStyle, width: 'auto', padding: '8px 10px', background: '#0f1b2c' }}>
                  Recenter
                </button>
              </div>
            </div>

              <div ref={viewportRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                <div ref={innerRef} style={{ position: 'absolute', left: 0, top: 0, width: lot.width, height: lot.height, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                  <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `scale(${zoom})` }}>
                  <svg width={lot.width} height={lot.height} viewBox={`0 0 ${lot.width} ${lot.height}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {lot.roads.map((road) => {
                      const shape = buildRoadShape(road);

                      return (
                        <g key={`${road.id}-shape`}>
                          <path d={shape.d} fill="none" stroke="#0b1624" strokeWidth={shape.strokeWidth + 12} strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                          <path d={shape.d} fill="none" stroke="#17283d" strokeWidth={shape.strokeWidth + 4} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                          <path d={shape.d} fill="none" stroke="#09111d" strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="1" />
                          {shape.anchors.map((anchor, index) => (
                            <circle key={`${road.id}-anchor-${index}`} cx={anchor.x} cy={anchor.y} r={shape.strokeWidth * 0.22} fill="#0f1b2c" stroke="#7bd3ff" strokeWidth="2" />
                          ))}
                        </g>
                      );
                    })}
                  </svg>

                  {lot.roads.map((road) => {
                    const draftRoad = items.find((item) => item.id === road.id && item.type === 'road');
                    const points = draftRoad?.type === 'road' ? draftRoad.points : road.points ?? [];
                    const bounds = getRoadBounds(points.length >= 2 ? points : [{ x: road.x, y: road.y }]);
                    const isSelected = selectedId === road.id;
                    const pad = 28;

                    return (
                      <div key={road.id}>
                        <div
                          data-lot-object
                          role="button"
                          tabIndex={0}
                          title="Drag to move road"
                          onPointerDown={(event) => beginRoadMove(road.id, event)}
                          onClick={() => setSelectedId(road.id)}
                          style={{
                            position: 'absolute',
                            left: bounds.minX - pad,
                            top: bounds.minY - pad,
                            width: bounds.maxX - bounds.minX + pad * 2,
                            height: bounds.maxY - bounds.minY + pad * 2,
                            cursor: 'grab',
                            zIndex: 2,
                            borderRadius: 16,
                            border: isSelected ? '2px dashed rgba(123,211,255,0.45)' : '1px solid transparent',
                            background: isSelected ? 'rgba(123,211,255,0.06)' : 'transparent',
                          }}
                        />

                        {points.map((point, pointIndex) => {
                          const isStart = pointIndex === 0;
                          const isEnd = pointIndex === points.length - 1;
                          const isBend = !isStart && !isEnd;

                          return (
                            <button
                              key={`${road.id}-point-${pointIndex}`}
                              type="button"
                              data-lot-object
                              onPointerDown={(event) => beginRoadPointDrag(road.id, pointIndex, event)}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(road.id);
                              }}
                              title={isStart ? 'Start — drag to connect' : isEnd ? 'End — drag to extend/connect' : `Bend ${pointIndex}`}
                              style={{
                                position: 'absolute',
                                left: point.x,
                                top: point.y,
                                transform: 'translate(-50%, -50%)',
                                width: isBend ? 34 : 40,
                                height: isBend ? 34 : 40,
                                borderRadius: '50%',
                                border: `2px solid ${isStart ? '#7bd3ff' : isEnd ? '#ffb74d' : '#3dd6a5'}`,
                                background: isStart ? '#0d1a2a' : isEnd ? '#23190c' : 'rgba(61,214,165,0.96)',
                                color: '#f4f7fb',
                                fontSize: isBend ? 11 : 12,
                                fontWeight: 900,
                                cursor: 'grab',
                                display: 'grid',
                                placeItems: 'center',
                                boxShadow: '0 0 0 6px rgba(123,211,255,0.1)',
                                zIndex: 4,
                              }}
                            >
                              {isStart ? 'S' : isEnd ? 'E' : pointIndex}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {lot.nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      draggable
                      onClick={() => setSelectedId(node.id)}
                      onDragStart={(event) => event.dataTransfer.setData('application/json', JSON.stringify({ type: node.kind, id: node.id }))}
                      style={{
                        position: 'absolute',
                        left: node.x,
                        top: node.y,
                        padding: '10px 12px',
                        borderRadius: 999,
                        background: 'rgba(15,27,44,0.92)',
                        border: '1px solid rgba(123,211,255,0.28)',
                        color: '#f4f7fb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'grab',
                      }}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3dd6a5', display: 'inline-block' }} />
                      <span style={{ fontWeight: 800 }}>{node.label}</span>
                    </button>
                  ))}

                  {lot.arrows.map((arrow) => (
                    <button
                      key={arrow.id}
                      type="button"
                      draggable
                      onClick={() => setSelectedId(arrow.id)}
                      onDragStart={(event) => event.dataTransfer.setData('application/json', JSON.stringify({ type: 'arrow', id: arrow.id }))}
                      style={{
                        position: 'absolute',
                        left: arrow.x,
                        top: arrow.y,
                        transform: `rotate(${arrow.rotation}deg)`,
                        borderRadius: 14,
                        border: '1px solid #24415f',
                        background: '#102033',
                        color: '#7bd3ff',
                        padding: '8px 10px',
                        cursor: 'grab',
                      }}
                    >
                      {arrow.label} →
                    </button>
                  ))}

                  {lot.slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      draggable
                      onClick={() => setSelectedId(slot.id)}
                      onDragStart={(event) => event.dataTransfer.setData('application/json', JSON.stringify({ type: 'slot', id: slot.id }))}
                      style={{
                        position: 'absolute',
                        left: slot.x,
                        top: slot.y,
                        width: 92,
                        height: 76,
                        transform: `rotate(${slot.rotation}deg)`,
                        borderRadius: 16,
                        border: `1px solid ${slot.status === 'available' ? '#3dd6a5' : slot.status === 'reserved' ? '#7bd3ff' : slot.status === 'occupied' ? '#ffb74d' : slot.status === 'blocked' ? '#ff8a80' : '#d1a3ff'}`,
                        background: slot.status === 'available' ? '#0c1a28' : slot.status === 'reserved' ? '#0d1a2a' : slot.status === 'occupied' ? '#23190c' : slot.status === 'blocked' ? '#281214' : '#20142a',
                        color: '#f4f7fb',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        cursor: 'grab',
                        boxShadow: selectedId === slot.id ? '0 0 0 3px rgba(61,214,165,0.24)' : 'none',
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{slot.label}</strong>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#b8c7da' }}>{slot.status}</span>
                    </button>
                  ))}
                  </div>
                </div>
              </div>
          </div>
        </div>

        <aside style={{ ...panelStyle, display: 'grid', gap: 12 }}>
          <div>
            <div style={labelStyle}>Selected item</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {selectedItem?.type === 'road' ? 'Road object' : selectedItem?.label ?? 'Nothing selected'}
            </div>
          </div>

          {selectedItem ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {selectedItem.type === 'road' ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Road type</label>
                    <select
                      value={selectedItem.roadKind}
                      onChange={(event) => updateItem(selectedItem.id, { roadKind: event.target.value as 'straight' | 'curve' } as Partial<DraftItem>)}
                      style={inputStyle}
                    >
                      <option value="straight">straight</option>
                      <option value="curve">curve</option>
                    </select>
                  </div>

                  <div style={{ background: '#08111d', border: '1px solid #1f3550', borderRadius: 16, padding: 12, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div>
                        <div style={{ color: '#f4f7fb', fontWeight: 800 }}>Bend points</div>
                        <div style={{ color: '#8ea4bc', fontSize: 12 }}>S = start, E = end (snap to other roads), numbered chips = bends.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.map((item) => {
                              if (item.id !== selectedItem.id || item.type !== 'road') {
                                return item;
                              }

                              const anchorA = item.points[Math.max(0, item.points.length - 2)] ?? { x: item.x, y: item.y };
                              const anchorB = item.points[item.points.length - 1] ?? { x: item.x + item.width, y: item.y };
                              const inserted = [...item.points.slice(0, -1), { x: (anchorA.x + anchorB.x) / 2, y: (anchorA.y + anchorB.y) / 2 - 48 }, anchorB];
                              return syncRoadFromPoints({ ...item, points: inserted });
                            }),
                          )
                        }
                        style={{ ...paletteButtonStyle, width: 'auto', padding: '10px 12px' }}
                      >
                        Add bend point
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                      {selectedItem.points.map((point, pointIndex) => {
                        const isBendPoint = pointIndex > 0 && pointIndex < selectedItem.points.length - 1;

                        return (
                          <div
                            key={`${selectedItem.id}-point-${pointIndex}`}
                            style={{
                              borderRadius: 14,
                              border: isBendPoint ? '1px solid #24415f' : '1px solid #1a2c43',
                              background: isBendPoint ? 'rgba(11,22,36,0.92)' : 'rgba(8,17,29,0.9)',
                              padding: 12,
                              display: 'grid',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div style={{ color: isBendPoint ? '#7bd3ff' : '#a9bdd6', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>
                                {pointIndex === 0 ? 'Start' : pointIndex === selectedItem.points.length - 1 ? 'End' : `Bend ${pointIndex}`}
                              </div>
                              {isBendPoint ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItems((current) =>
                                      current.map((item) => {
                                        if (item.id !== selectedItem.id || item.type !== 'road') {
                                          return item;
                                        }

                                        return syncRoadFromPoints({ ...item, points: removeRoadPoint(item.points, pointIndex) });
                                      }),
                                    )
                                  }
                                  style={{
                                    borderRadius: 999,
                                    border: '1px solid #ff8a80',
                                    background: '#281214',
                                    color: '#ff8a80',
                                    padding: '6px 10px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                  }}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                              <input type="number" value={Math.round(point.x)} onChange={(event) => updateRoadPoint(selectedItem.id, pointIndex, { x: Number(event.target.value) })} style={inputStyle} />
                              <input type="number" value={Math.round(point.y)} onChange={(event) => updateRoadPoint(selectedItem.id, pointIndex, { y: Number(event.target.value) })} style={inputStyle} />
                            </div>
                            {(pointIndex === 0 || pointIndex === selectedItem.points.length - 1) ? (
                              <button
                                type="button"
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
                                style={{ ...paletteButtonStyle, width: '100%', padding: '8px 10px', fontSize: 12 }}
                              >
                                Snap {pointIndex === 0 ? 'start' : 'end'} to nearest road
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : 'status' in selectedItem ? (
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={selectedItem.type === 'slot' ? selectedItem.status : 'available'}
                    onChange={(event) => selectedItem.type === 'slot' && updateItem(selectedItem.id, { status: event.target.value as ParkingSlotStatus } as Partial<DraftItem>)}
                    style={inputStyle}
                  >
                    <option value="available">available</option>
                    <option value="reserved">reserved</option>
                    <option value="occupied">occupied</option>
                    <option value="blocked">blocked</option>
                    <option value="disputed">disputed</option>
                  </select>
                </div>
              ) : null}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div>
                  <label style={labelStyle}>{selectedItem.type === 'road' ? 'Bounds X' : 'X'}</label>
                  <input
                    type="number"
                    value={Math.round(selectedItem.type === 'road' ? getRoadBounds(selectedItem.points).minX : selectedItem.x)}
                    onChange={(event) => updateItem(selectedItem.id, { x: Number(event.target.value) } as Partial<DraftItem>)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{selectedItem.type === 'road' ? 'Bounds Y' : 'Y'}</label>
                  <input
                    type="number"
                    value={Math.round(selectedItem.type === 'road' ? getRoadBounds(selectedItem.points).minY : selectedItem.y)}
                    onChange={(event) => updateItem(selectedItem.id, { y: Number(event.target.value) } as Partial<DraftItem>)}
                    style={inputStyle}
                  />
                </div>
              </div>
              {selectedItem.type === 'road' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>{selectedItem.roadKind === 'straight' ? 'Length' : 'Span X'}</label>
                    <input
                      type="number"
                      min={80}
                      value={Math.round(selectedItem.width)}
                      onChange={(event) => updateItem(selectedItem.id, { width: Number(event.target.value) } as Partial<DraftItem>)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Thickness</label>
                    <input
                      type="number"
                      min={48}
                      value={Math.round(selectedItem.height)}
                      onChange={(event) => updateItem(selectedItem.id, { height: Number(event.target.value) } as Partial<DraftItem>)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              ) : null}
              <div>
                <label style={labelStyle}>Rotation</label>
                <input type="number" value={selectedItem.rotation} onChange={(event) => updateItem(selectedItem.id, { rotation: Number(event.target.value) } as Partial<DraftItem>)} style={inputStyle} />
              </div>
              <button type="button" onClick={removeSelected} style={dangerButtonStyle}>Remove item</button>
            </div>
          ) : (
            <div style={helperBoxStyle}>Select a slot, road, entry, exit, or arrow to adjust it.</div>
          )}

          <div>
            <div style={labelStyle}>Export JSON</div>
            <textarea readOnly value={JSON.stringify(lot, null, 2)} style={{ ...inputStyle, minHeight: 280, fontFamily: 'Consolas, monospace', fontSize: 12 }} />
          </div>
        </aside>
      </section>

      {showResetModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,12,0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ width: 460, borderRadius: 12, padding: 20, background: '#07101a', border: '1px solid #1a2c43' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#f4f7fb', marginBottom: 8 }}>Reset lot to entry gate</div>
            <div style={{ color: '#a9bdd6', marginBottom: 16 }}>Are you sure you want to reset the lot to only the entry gate? This will remove all other items.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={closeResetModal} style={{ ...paletteButtonStyle, width: 'auto', padding: '8px 12px' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToEntryGate();
                  closeResetModal();
                }}
                style={{ ...dangerButtonStyle, width: 'auto', padding: '8px 12px' }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </main>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#0f1b2c',
  borderRadius: 24,
  border: '1px solid #18283f',
  padding: 18,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#7f94ad',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 800,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid #26405f',
  background: '#08111d',
  color: '#f4f7fb',
  padding: '10px 12px',
  outline: 'none',
};

const helperBoxStyle: React.CSSProperties = {
  background: '#08111d',
  borderRadius: 16,
  border: '1px solid #18283f',
  padding: 12,
  color: '#a9bdd6',
  lineHeight: 1.6,
};

const paletteButtonStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  borderRadius: 16,
  border: '1px solid #26405f',
  background: '#08111d',
  color: '#f4f7fb',
  padding: 12,
  display: 'grid',
  gap: 4,
  cursor: 'grab',
};

const dangerButtonStyle: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid #ff8a80',
  background: '#281214',
  color: '#ff8a80',
  padding: '10px 12px',
  fontWeight: 800,
  cursor: 'pointer',
};
