'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ParkingSlot } from '@/lib/types';
import { mockParkingMap } from '@/lib/mock-data';
import { Plus, Trash2, Save, Copy, ZoomIn, ZoomOut } from 'lucide-react';

export default function MapBuilderPage() {
  const [slots, setSlots] = useState<ParkingSlot[]>(mockParkingMap.slots);
  const [mapName, setMapName] = useState(mockParkingMap.name);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [gridSize, setGridSize] = useState(20);
  const [draggingSlot, setDraggingSlot] = useState<{
    id: string;
    startX: number;
    startY: number;
    slotX: number;
    slotY: number;
  } | null>(null);

  const handleAddSlot = () => {
    const newSlot: ParkingSlot = {
      id: `slot-${Date.now()}`,
      slotNumber: `A${String(slots.length + 1).padStart(2, '0')}`,
      status: 'available',
      x: Math.random() * 200,
      y: Math.random() * 200,
      width: 60,
      height: 100,
      rotation: 0,
      vehicleType: 'standard',
    };
    setSlots([...slots, newSlot]);
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
    if (selectedSlot === id) setSelectedSlot(null);
  };

  const handleSlotChange = (id: string, updates: Partial<ParkingSlot>) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleDragStart = (
    e: React.MouseEvent<SVGRectElement>,
    slotId: string
  ) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    setDraggingSlot({
      id: slotId,
      startX: e.clientX,
      startY: e.clientY,
      slotX: slot.x,
      slotY: slot.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingSlot) return;

    const deltaX = e.clientX - draggingSlot.startX;
    const deltaY = e.clientY - draggingSlot.startY;

    const snappedX = Math.round((draggingSlot.slotX + deltaX / zoom) / gridSize) * gridSize;
    const snappedY = Math.round((draggingSlot.slotY + deltaY / zoom) / gridSize) * gridSize;

    handleSlotChange(draggingSlot.id, {
      x: Math.max(0, snappedX),
      y: Math.max(0, snappedY),
    });
  };

  const handleMouseUp = () => {
    setDraggingSlot(null);
  };

  const handleDuplicate = (id: string) => {
    const slotToDuplicate = slots.find((s) => s.id === id);
    if (!slotToDuplicate) return;

    const newSlot: ParkingSlot = {
      ...slotToDuplicate,
      id: `slot-${Date.now()}`,
      x: slotToDuplicate.x + 80,
      y: slotToDuplicate.y,
    };
    setSlots([...slots, newSlot]);
  };

  const canvasWidth = Math.max(
    slots.reduce((max, s) => Math.max(max, s.x + s.width), 0) + 100,
    600
  );
  const canvasHeight = Math.max(
    slots.reduce((max, s) => Math.max(max, s.y + s.height), 0) + 100,
    400
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Map Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create and customize your parking lot layout with drag-and-drop editing
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Tools */}
          <div className="space-y-6">
            {/* Map Settings */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-foreground">
                  Map Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Map Name
                  </label>
                  <Input
                    value={mapName}
                    onChange={(e) => setMapName(e.target.value)}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Grid Size: {gridSize}px
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  Save Map
                </Button>
              </CardContent>
            </Card>

            {/* Tools */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-foreground">
                  Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleAddSlot}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slot
                </Button>

                <Button
                  onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
                  variant="outline"
                  className="w-full border-border"
                >
                  <ZoomIn className="w-4 h-4 mr-2" />
                  Zoom In
                </Button>

                <Button
                  onClick={() => setZoom(Math.max(zoom - 0.2, 0.6))}
                  variant="outline"
                  className="w-full border-border"
                >
                  <ZoomOut className="w-4 h-4 mr-2" />
                  Zoom Out
                </Button>
              </CardContent>
            </Card>

            {/* Slot List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-foreground">
                  Slots ({slots.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedSlot === slot.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-secondary/80 text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{slot.slotNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            ({slot.x.toFixed(0)}, {slot.y.toFixed(0)})
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(slot.id);
                            }}
                            className="p-1 hover:bg-black/20 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlot(slot.id);
                            }}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Canvas */}
          <div className="lg:col-span-3 space-y-6">
            {/* Properties Panel */}
            {selectedSlot && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-foreground">
                    Slot Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {slots
                    .filter((s) => s.id === selectedSlot)
                    .map((slot) => (
                      <div key={slot.id} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Slot Number
                          </label>
                          <Input
                            value={slot.slotNumber}
                            onChange={(e) =>
                              handleSlotChange(slot.id, {
                                slotNumber: e.target.value,
                              })
                            }
                            className="bg-input border-border text-foreground text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            X Position
                          </label>
                          <Input
                            type="number"
                            value={Math.round(slot.x)}
                            onChange={(e) =>
                              handleSlotChange(slot.id, { x: Number(e.target.value) })
                            }
                            className="bg-input border-border text-foreground text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Y Position
                          </label>
                          <Input
                            type="number"
                            value={Math.round(slot.y)}
                            onChange={(e) =>
                              handleSlotChange(slot.id, { y: Number(e.target.value) })
                            }
                            className="bg-input border-border text-foreground text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Width
                          </label>
                          <Input
                            type="number"
                            value={slot.width}
                            onChange={(e) =>
                              handleSlotChange(slot.id, { width: Number(e.target.value) })
                            }
                            className="bg-input border-border text-foreground text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Height
                          </label>
                          <Input
                            type="number"
                            value={slot.height}
                            onChange={(e) =>
                              handleSlotChange(slot.id, { height: Number(e.target.value) })
                            }
                            className="bg-input border-border text-foreground text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Vehicle Type
                          </label>
                          <select
                            value={slot.vehicleType}
                            onChange={(e) =>
                              handleSlotChange(slot.id, {
                                vehicleType: e.target.value as ParkingSlot['vehicleType'],
                              })
                            }
                            className="w-full px-2 py-1 bg-input border border-border text-foreground text-sm rounded-md"
                          >
                            <option value="standard">Standard</option>
                            <option value="compact">Compact</option>
                            <option value="handicap">Handicap</option>
                          </select>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Canvas */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div
                  className="bg-secondary rounded-lg overflow-auto border border-border"
                  style={{ maxHeight: '600px' }}
                >
                  <svg
                    width={canvasWidth * zoom}
                    height={canvasHeight * zoom}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: '0 0',
                      transition: draggingSlot ? 'none' : 'transform 0.2s ease-out',
                      cursor: draggingSlot ? 'grabbing' : 'grab',
                    }}
                  >
                    {/* Grid */}
                    <defs>
                      <pattern
                        id="builder-grid"
                        width={gridSize}
                        height={gridSize}
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                          fill="none"
                          stroke="#3a3a3a"
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect
                      width={canvasWidth}
                      height={canvasHeight}
                      fill="url(#builder-grid)"
                    />

                    {/* Slots */}
                    {slots.map((slot) => (
                      <g key={slot.id}>
                        <rect
                          x={slot.x}
                          y={slot.y}
                          width={slot.width}
                          height={slot.height}
                          fill={
                            selectedSlot === slot.id
                              ? '#3b82f6'
                              : '#10b981'
                          }
                          fillOpacity="0.6"
                          stroke={selectedSlot === slot.id ? '#60a5fa' : '#10b981'}
                          strokeWidth="2"
                          rx="4"
                          style={{
                            cursor: 'grab',
                            filter:
                              selectedSlot === slot.id
                                ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                                : 'none',
                          }}
                          onMouseDown={(e) => handleDragStart(e, slot.id)}
                          onClick={() => setSelectedSlot(slot.id)}
                        />
                        <text
                          x={slot.x + slot.width / 2}
                          y={slot.y + slot.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fill="white"
                          style={{
                            cursor: 'grab',
                            pointerEvents: 'none',
                            userSelect: 'none',
                          }}
                        >
                          {slot.slotNumber}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
