'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import {
  buildRoadShape,
  createEmptyParkingLotDefinition,
  type ParkingMapPoint,
  type ParkingLotDefinition,
  type ParkingSlotStatus,
  type ParkingMapArrowDirection,
} from '../../lib/parkingMap';

type DraftItemType = 'slot' | 'road-straight' | 'road-curve' | 'entry' | 'exit' | 'arrow';

type DraftItem =
  | { id: string; type: 'slot'; label: string; status: ParkingSlotStatus; x: number; y: number; rotation: number }
  | { id: string; type: 'road'; label: string; x: number; y: number; width: number; height: number; rotation: number; points: ParkingMapPoint[]; roadKind: 'straight' | 'curve' }
  | { id: string; type: 'entry' | 'exit'; label: string; x: number; y: number; rotation: number; direction: ParkingMapArrowDirection }
  | { id: string; type: 'arrow'; label: string; x: number; y: number; rotation: number };

function cloneItem(item: DraftItem): DraftItem {
  return JSON.parse(JSON.stringify(item)) as DraftItem;
}

function getRoadBounds(points: ParkingMapPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function translatePoints(points: ParkingMapPoint[], deltaX: number, deltaY: number) {
  return points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY }));
}

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
    return {
      id,
      type: 'road',
      roadKind: 'straight',
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
    };
  }

  if (type === 'road-curve') {
    return {
      id,
      type: 'road',
      roadKind: 'curve',
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
    };
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

    const entryItem: DraftItem = { id: entry.id, type: 'entry', label: entry.label, x: entry.x, y: entry.y, rotation: 0, direction: entry.direction };
    return [entryItem];
  });
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [showResetModal, setShowResetModal] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0 });

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
    if (target?.closest('button, input, select, textarea, a')) return;

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

  // center viewport on entry gate on first mount
  useEffect(() => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const entry = createEmptyParkingLotDefinition(lotName).nodes.find((n) => n.kind === 'entry');
    if (!entry) return;

    const desiredX = rect.width / 2; // center horizontally
    const desiredY = rect.height * 0.75; // place entry ~25% from bottom (75% from top)

    setPanState({ x: desiredX - entry.x * zoomRef.current, y: desiredY - entry.y * zoomRef.current });
    // only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetToEntryGate() {
    const base = createEmptyParkingLotDefinition(lotName);
    const entry = base.nodes.find((n) => n.kind === 'entry');
    if (!entry) return;

    const entryItem: DraftItem = { id: entry.id, type: 'entry', label: entry.label, x: entry.x, y: entry.y, rotation: 0, direction: entry.direction };
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
    setItems((current) => current.map((item) => (item.id === id ? ({ ...item, ...patch } as DraftItem) : item)));
  }

  function updateRoadPoint(roadId: string, pointIndex: number, patch: Partial<ParkingMapPoint>) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== roadId || item.type !== 'road') {
          return item;
        }

        const points = item.points.map((point, index) => (index === pointIndex ? { ...point, ...patch } : point));

        return { ...item, points };
      }),
    );
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
            const deltaX = x - currentCenterX;
            const deltaY = y - currentCenterY;
            const translatedPoints = translatePoints(item.points, deltaX, deltaY);
            const translatedBounds = getRoadBounds(translatedPoints);

            return {
              ...cloneItem(item),
              x: translatedBounds.minX,
              y: translatedBounds.minY,
              width: translatedBounds.maxX - translatedBounds.minX,
              height: translatedBounds.maxY - translatedBounds.minY,
              points: translatedPoints,
            };
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

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 12, fontWeight: 800, margin: 0 }}>Parking Lot Builder</p>
          <h1 style={{ margin: '8px 0 0', fontSize: 40, lineHeight: 1.05 }}>Drag, place, and shape your parking lot.</h1>
          <p style={{ color: '#a9bdd6', maxWidth: 780, lineHeight: 1.6 }}>
            This is the admin editor for creating a lot layout. Add slots, driveways, curves, entry and exit points, then tune the data before the app renders it.
          </p>
        </div>
        <Link
          href="/parking-map"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 12,
            background: '#1a2e49',
            color: '#f4f7fb',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          View Parking Map
        </Link>
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
            <div style={helperBoxStyle}>Drag an item into the canvas. Click an item to inspect it. Use the inspector to change its coordinates, rotation, or status.</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={openResetModal} style={{ ...paletteButtonStyle, width: '100%', padding: '10px 12px', background: '#07101a' }}>
              Reset to entry gate
            </button>
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
                    const shape = buildRoadShape(road);

                    return (
                      <div key={road.id}>
                        {shape.bendHandles.map((handle, handleIndex) => {
                          const pointIndex = handleIndex + 1;
                          const isBendPoint = pointIndex > 0 && pointIndex < road.points.length - 1;

                          return (
                            <button
                              key={`${road.id}-bend-${pointIndex}`}
                              type="button"
                              onClick={() => setSelectedId(road.id)}
                              title={isBendPoint ? `Bend point ${pointIndex}` : pointIndex === 0 ? 'Start point' : 'End point'}
                              style={{
                                position: 'absolute',
                                left: handle.x,
                                top: handle.y,
                                transform: 'translate(-50%, -50%)',
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                border: '2px solid #7bd3ff',
                                background: 'rgba(61,214,165,0.96)',
                                color: '#07101a',
                                fontSize: 12,
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                boxShadow: '0 0 0 7px rgba(123,211,255,0.12)',
                                zIndex: 3,
                              }}
                            >
                              {pointIndex}
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
                        <div style={{ color: '#8ea4bc', fontSize: 12 }}>Blue outer ring = handle, green chip = editable bend point.</div>
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
                              return { ...item, points: inserted };
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

                                        return { ...item, points: removeRoadPoint(item.points, pointIndex) };
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
                  <label style={labelStyle}>X</label>
                  <input type="number" value={Math.round(selectedItem.x)} onChange={(event) => updateItem(selectedItem.id, { x: Number(event.target.value) } as Partial<DraftItem>)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Y</label>
                  <input type="number" value={Math.round(selectedItem.y)} onChange={(event) => updateItem(selectedItem.id, { y: Number(event.target.value) } as Partial<DraftItem>)} style={inputStyle} />
                </div>
              </div>
              {selectedItem.type === 'road' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Width</label>
                    <input
                      type="number"
                      min={80}
                      value={selectedItem.width}
                      onChange={(event) => updateItem(selectedItem.id, { width: Number(event.target.value) } as Partial<DraftItem>)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Height</label>
                    <input
                      type="number"
                      min={48}
                      value={selectedItem.height}
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