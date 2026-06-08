"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  CircleX,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  ParkingCircle,
  RotateCcw,
  Settings2,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { applyOptimisticSlotStatus } from '@/lib/operatorDataStore';
import { refreshOperatorData } from '@/lib/operatorDataStore';
import {
  buildRoadShape,
  type ParkingLotDefinition,
  type ParkingMapRoad,
  type ParkingSlotStatus,
} from '@/lib/parkingMap';
import type { ParkingSlot } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

const NODE_WIDTH = 152;
const NODE_HEIGHT = 40;

function getRoadStroke(roadKind: 'straight' | 'curve') {
  return roadKind === 'curve' ? '#60a5fa' : '#3b82f6';
}

function normalizeRoadStrokeWidth(width: number) {
  const normalized = Math.max(48, Math.round(width));
  return normalized % 2 === 0 ? normalized : normalized + 1;
}

function toLayoutSlotStatus(status: ParkingSlot['status']): ParkingSlotStatus {
  return status === 'maintenance' ? 'blocked' : status;
}

function getSlotVisualOffset(slot: { x: number; y: number; width: number; height: number; rotation: number }) {
  if (slot.rotation === 0) {
    return { x: 0, y: 0 };
  }

  const center = {
    x: slot.x + slot.width / 2,
    y: slot.y + slot.height / 2,
  };
  const radians = (slot.rotation * Math.PI) / 180;
  const anchor =
    slot.rotation < 0
      ? { x: slot.x + slot.width, y: slot.y + slot.height / 2 }
      : { x: slot.x, y: slot.y + slot.height / 2 };
  const offsetX = anchor.x - center.x;
  const offsetY = anchor.y - center.y;
  const rotatedAnchor = {
    x: center.x + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: center.y + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };

  return {
    x: anchor.x - rotatedAnchor.x,
    y: anchor.y - rotatedAnchor.y,
  };
}

function getRenderedSlotFrame(slot: { x: number; y: number; width: number; height: number; rotation: number }) {
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

function getSlotFill(status: ParkingSlot['status']) {
  switch (status) {
    case 'available':
      return { fill: '#10b981', stroke: '#34d399' };
    case 'occupied':
      return { fill: '#ef4444', stroke: '#f87171' };
    case 'reserved':
      return { fill: '#3b82f6', stroke: '#60a5fa' };
    case 'maintenance':
      return { fill: '#6b7280', stroke: '#94a3b8' };
  }
}

function getSlotStatusDisplay(status: ParkingSlot['status']) {
  switch (status) {
    case 'maintenance':
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
  const availableWidth = Math.max(40, width - 16);
  return Math.max(8, Math.min(12, Math.floor((availableWidth / Math.max(label.length, 1)) * 1.75)));
}

function getSlotStatusFontSize(width: number, label: string) {
  const availableWidth = Math.max(40, width - 16);
  return Math.max(7, Math.min(10, Math.floor((availableWidth / Math.max(label.length, 1)) * 1.55)));
}

function getNodeFill(kind: 'entry' | 'exit' | 'junction') {
  if (kind === 'entry') return { fill: '#10b981', stroke: '#34d399' };
  if (kind === 'exit') return { fill: '#ef4444', stroke: '#f87171' };
  return { fill: '#8b5cf6', stroke: '#a78bfa' };
}

function buildFallbackLayout(name: string, slots: ParkingSlot[]): ParkingLotDefinition {
  const width = Math.max(960, ...slots.map((slot) => slot.x + slot.width + 120));
  const height = Math.max(720, ...slots.map((slot) => slot.y + slot.height + 120));

  return {
    id: 'parking-map-fallback',
    name,
    width,
    height,
    roads: [],
    nodes: [],
    arrows: [],
    slots: slots.map((slot, index) => ({
      id: slot.id,
      label: slot.slotNumber,
      status: toLayoutSlotStatus(slot.status),
      displayOrder: index + 1,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation,
      width: slot.width,
      height: slot.height,
    })),
  };
}

export default function ParkingMapPage() {
  const [zoom, setZoom] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ParkingSlot['status'] | null>(null);
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');

  const { data, loading, refresh } = useOperatorData();
  const map = data?.parkingMap ?? {
    id: 'map-empty',
    name: 'Parking Lot',
    totalSlots: 0,
    slots: [] as ParkingSlot[],
    layout: null,
  };

  const stats = useMemo(
    () => ({
      available: map.slots.filter((slot: ParkingSlot) => slot.status === 'available').length,
      occupied: map.slots.filter((slot: ParkingSlot) => slot.status === 'occupied').length,
      reserved: map.slots.filter((slot: ParkingSlot) => slot.status === 'reserved').length,
      maintenance: map.slots.filter((slot: ParkingSlot) => slot.status === 'maintenance').length,
    }),
    [map.slots],
  );

  const selectedSlotData = useMemo(
    () => map.slots.find((slot: ParkingSlot) => slot.id === selectedSlot) ?? null,
    [map.slots, selectedSlot],
  );

  const layout = useMemo(() => {
    const baseLayout = map.layout ?? buildFallbackLayout(map.name, map.slots);
    const liveSlotById = new Map(map.slots.map((slot: ParkingSlot) => [slot.id, slot]));

    return {
      ...baseLayout,
      slots: baseLayout.slots.map((slot) => {
        const live = liveSlotById.get(slot.id);
        return {
          ...slot,
          label: live?.slotNumber ?? slot.label,
          status: live ? toLayoutSlotStatus(live.status) : slot.status,
          width: live?.width ?? slot.width,
          height: live?.height ?? slot.height,
          rotation: live?.rotation ?? slot.rotation,
        };
      }),
    };
  }, [map.layout, map.name, map.slots]);

  useEffect(() => {
    void refreshOperatorData({ silent: true });
  }, []);

  useEffect(() => {
    if (selectedSlot && !map.slots.some((slot: ParkingSlot) => slot.id === selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [map.slots, selectedSlot]);

  const filteredSlotIds = useMemo(() => {
    if (!filterStatus) {
      return null;
    }

    return new Set(
      map.slots
        .filter((slot: ParkingSlot) => slot.status === filterStatus)
        .map((slot: ParkingSlot) => slot.id),
    );
  }, [filterStatus, map.slots]);

  const handleSlotStatusChange = async (slotId: string, newStatus: ParkingSlot['status']) => {
    const previousSlot = map.slots.find((slot: ParkingSlot) => slot.id === slotId);

    if (!previousSlot || previousSlot.status === newStatus) {
      return;
    }

    setUpdatingSlotId(slotId);
    setMessage(null);
    applyOptimisticSlotStatus(slotId, newStatus);

    try {
      const res = await fetch('/api/operator/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, updates: { status: newStatus } }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to update slot status.');
      }

      setMessage(`Updated ${previousSlot.slotNumber} to ${newStatus}.`);
      setMessageTone('success');
      await refresh({ silent: true });
    } catch (error) {
      applyOptimisticSlotStatus(slotId, previousSlot.status);
      setMessage(error instanceof Error ? error.message : 'Failed to update slot status.');
      setMessageTone('error');
      await refresh({ silent: true });
    } finally {
      setUpdatingSlotId(null);
    }
  };

  return (
    <DashboardLayout fullWidth>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Parking Map</h1>
            <p className="mt-2 text-muted-foreground">
              Live operational map backed by the applied parking lot layout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-border" onClick={() => setZoom((current) => Math.max(0.5, current - 0.1))}>
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </Button>
            <Button variant="outline" className="border-border" onClick={() => setZoom(1)}>
              <RotateCcw className="h-4 w-4" />
              Reset Zoom
            </Button>
            <Button variant="outline" className="border-border" onClick={() => setZoom((current) => Math.min(2, current + 0.1))}>
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </Button>
            <Button asChild>
              <Link href="/dashboard/map-builder">
                <Settings2 className="h-4 w-4" />
                Edit Map
              </Link>
            </Button>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              messageTone === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Available', count: stats.available, color: 'bg-green-500/10 text-green-400' },
            { label: 'Occupied', count: stats.occupied, color: 'bg-red-500/10 text-red-400' },
            { label: 'Reserved', count: stats.reserved, color: 'bg-blue-500/10 text-blue-400' },
            { label: 'Maintenance', count: stats.maintenance, color: 'bg-slate-500/10 text-slate-300' },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card">
              <CardContent className="pt-6">
                <div className={`mb-3 rounded-lg p-3 text-lg font-bold ${stat.color}`}>{stat.count}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">{layout.name}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['available', 'occupied', 'reserved', 'maintenance'] as const).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={filterStatus === status ? 'default' : 'outline'}
                        className={filterStatus === status ? '' : 'border-border'}
                        onClick={() => setFilterStatus((current) => (current === status ? null : status))}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant={filterStatus === null ? 'default' : 'outline'}
                      className={filterStatus === null ? '' : 'border-border'}
                      onClick={() => setFilterStatus(null)}
                    >
                      All
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {layout.slots.length} slots applied to this lot
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-auto rounded-lg border border-border bg-secondary/30" style={{ maxHeight: '75vh' }}>
                <div className="relative" style={{ width: layout.width * zoom, height: layout.height * zoom }}>
                  {loading ? (
                    <div className="absolute inset-0 z-20 grid place-items-center">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading parking map...
                      </div>
                    </div>
                  ) : null}

                  <svg
                    width={layout.width}
                    height={layout.height}
                    className="absolute inset-0 overflow-visible"
                    shapeRendering="geometricPrecision"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    <defs>
                      <pattern id="parking-map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width={layout.width} height={layout.height} fill="url(#parking-map-grid)" />

                    {layout.roads.map((road) => {
                      const shape = buildRoadShape(road as ParkingMapRoad);
                      const stroke = getRoadStroke(road.kind);
                      const roadBodyWidth = normalizeRoadStrokeWidth(road.height);

                      return (
                        <g key={road.id}>
                          <path
                            d={shape.d}
                            stroke={stroke}
                            strokeWidth={roadBodyWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            opacity={0.95}
                          />
                          <path
                            d={shape.d}
                            stroke="#e2e8f0"
                            strokeWidth={Math.max(4, Math.min(8, roadBodyWidth * 0.1))}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={`${Math.max(18, roadBodyWidth * 0.45)} ${Math.max(12, roadBodyWidth * 0.3)}`}
                            fill="none"
                            opacity={0.8}
                          />
                          <text
                            x={shape.labelX}
                            y={shape.labelY}
                            fill="#e2e8f0"
                            fontSize="13"
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {road.label}
                          </text>
                        </g>
                      );
                    })}

                    {layout.nodes.map((node) => {
                      const tone = getNodeFill(node.kind);
                      const Icon = node.kind === 'entry' ? LogIn : node.kind === 'exit' ? LogOut : MapPin;

                      return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                          <rect
                            x={0}
                            y={0}
                            width={NODE_WIDTH}
                            height={NODE_HEIGHT}
                            rx={20}
                            fill={tone.fill}
                            fillOpacity={0.18}
                            stroke={tone.stroke}
                            strokeWidth={2}
                          />
                          <foreignObject x={0} y={0} width={NODE_WIDTH} height={NODE_HEIGHT}>
                            <div className="flex h-full items-center justify-center gap-2 px-4 text-sm font-medium text-slate-100">
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{node.label}</span>
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}

                    {layout.arrows.map((arrow) => (
                      <g key={arrow.id} transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.rotation})`}>
                        <text x={0} y={0} fill="#bfdbfe" fontSize="28" fontWeight="700">
                          →
                        </text>
                        <text x={22} y={5} fill="#e2e8f0" fontSize="12" fontWeight="600">
                          {arrow.label}
                        </text>
                      </g>
                    ))}

                    {layout.slots
                      .filter((slot) => !filteredSlotIds || filteredSlotIds.has(slot.id))
                      .map((slot) => {
                        const live = map.slots.find((entry: ParkingSlot) => entry.id === slot.id);
                        const width = live?.width ?? slot.width ?? 64;
                        const height = live?.height ?? slot.height ?? 124;
                        const rotation = live?.rotation ?? slot.rotation;
                        const status = live?.status ?? (slot.status === 'blocked' || slot.status === 'disputed' ? 'maintenance' : (slot.status as ParkingSlot['status']));
                        const frame = getRenderedSlotFrame({
                          x: slot.x,
                          y: slot.y,
                          width,
                          height,
                          rotation,
                        });
                        const tone = getSlotFill(status);
                        const selected = selectedSlot === slot.id;
                        const slotLabel = live?.slotNumber ?? slot.label;
                        const slotStatusLabel = getSlotStatusDisplay(status);
                        const labelFontSize = getSlotLabelFontSize(width, slotLabel);
                        const statusFontSize = getSlotStatusFontSize(width, slotStatusLabel);

                        return (
                          <g
                            key={slot.id}
                            transform={`translate(${frame.x}, ${frame.y}) rotate(${rotation}, ${width / 2}, ${height / 2})`}
                            onClick={() => setSelectedSlot((current) => (current === slot.id ? null : slot.id))}
                            style={{ cursor: 'pointer' }}
                          >
                            <rect
                              x={0}
                              y={0}
                              width={width}
                              height={height}
                              rx={10}
                              fill={tone.fill}
                              fillOpacity={0.18}
                              stroke={tone.stroke}
                              strokeWidth={selected ? 3 : 2}
                              style={{
                                filter: selected ? 'drop-shadow(0 0 10px rgba(191,219,254,0.45))' : 'none',
                              }}
                            />
                            <text
                              x={width / 2}
                              y={height / 2 - 8}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={labelFontSize}
                              fontWeight="700"
                              fill="#f8fafc"
                            >
                              {slotLabel}
                            </text>
                            <text
                              x={width / 2}
                              y={height / 2 + 14}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={statusFontSize}
                              fontWeight="600"
                              fill="#e2e8f0"
                            >
                              {slotStatusLabel}
                            </text>
                          </g>
                        );
                      })}
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="xl:sticky xl:top-6 xl:self-start">
            {selectedSlotData ? (
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">{selectedSlotData.slotNumber}</CardTitle>
                      <div className="mt-2">
                        <Badge
                          className={`border text-xs font-medium ${
                            selectedSlotData.status === 'available'
                              ? 'border-green-400/20 bg-green-500/10 text-green-300'
                              : selectedSlotData.status === 'occupied'
                                ? 'border-red-400/20 bg-red-500/10 text-red-300'
                                : selectedSlotData.status === 'reserved'
                                  ? 'border-blue-400/20 bg-blue-500/10 text-blue-300'
                                  : 'border-slate-400/20 bg-slate-500/10 text-slate-200'
                          }`}
                        >
                          {selectedSlotData.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedSlot(null)}
                    >
                      <CircleX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">Position</div>
                      <div className="font-mono text-foreground">
                        ({Math.round(selectedSlotData.x)}, {Math.round(selectedSlotData.y)})
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">Dimensions</div>
                      <div className="font-mono text-foreground">
                        {selectedSlotData.width} x {selectedSlotData.height}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-xs text-muted-foreground">Change Status</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { status: 'available' as const, icon: CheckCircle },
                        { status: 'occupied' as const, icon: ParkingCircle },
                        { status: 'reserved' as const, icon: AlertCircle },
                        { status: 'maintenance' as const, icon: Wrench },
                      ]).map(({ status, icon: Icon }) => {
                        const isCurrent = selectedSlotData.status === status;
                        const isUpdating = updatingSlotId === selectedSlotData.id;

                        return (
                          <Button
                            key={status}
                            size="sm"
                            variant={isCurrent ? 'default' : 'outline'}
                            className={isCurrent ? '' : 'border-border'}
                            disabled={isUpdating}
                            onClick={() => void handleSlotStatusChange(selectedSlotData.id, status)}
                          >
                            {isUpdating && !isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border bg-card">
                <CardContent className="space-y-3 p-5">
                  <p className="text-sm font-medium text-foreground">Slot inspector</p>
                  <p className="text-sm text-muted-foreground">
                    Select a slot on the parking map to inspect it and change its status.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
