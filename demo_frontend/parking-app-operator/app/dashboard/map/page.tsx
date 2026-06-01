'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockParkingMap } from '@/lib/mock-data';
import { ParkingSlot } from '@/lib/types';
import { Zap, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function ParkingMapPage() {
  const [zoom, setZoom] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const map = mockParkingMap;

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prev) => 
      direction === 'in' 
        ? Math.min(prev + 0.2, 2) 
        : Math.max(prev - 0.2, 0.6)
    );
  };

  const resetZoom = () => setZoom(1);

  const getSlotColor = (status: ParkingSlot['status']) => {
    switch (status) {
      case 'available':
        return '#10b981'; // green
      case 'occupied':
        return '#ef4444'; // red
      case 'reserved':
        return '#3b82f6'; // blue
      case 'maintenance':
        return '#6b7280'; // gray
    }
  };

  const availableSlots = map.slots.filter((s) => s.status === 'available').length;
  const occupiedSlots = map.slots.filter((s) => s.status === 'occupied').length;
  const reservedSlots = map.slots.filter((s) => s.status === 'reserved').length;
  const maintenanceSlots = map.slots.filter((s) => s.status === 'maintenance').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parking Map</h1>
          <p className="text-muted-foreground mt-2">
            Visual layout of your parking lot with real-time slot status
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Available', count: availableSlots, color: 'bg-green-500/10 text-green-400' },
            { label: 'Occupied', count: occupiedSlots, color: 'bg-red-500/10 text-red-400' },
            { label: 'Reserved', count: reservedSlots, color: 'bg-blue-500/10 text-blue-400' },
            { label: 'Maintenance', count: maintenanceSlots, color: 'bg-gray-500/10 text-gray-400' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className={`p-3 rounded-lg ${stat.color} mb-3 text-lg font-bold`}>
                  {stat.count}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Map Container */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              {map.name}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleZoom('in')}
                className="border-border"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetZoom}
                className="border-border"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleZoom('out')}
                className="border-border"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-secondary rounded-lg p-8 overflow-auto" style={{ maxHeight: '600px' }}>
              <svg
                width={Math.max(map.slots.reduce((max, s) => Math.max(max, s.x + s.width), 0) + 100, 600) * zoom}
                height={Math.max(map.slots.reduce((max, s) => Math.max(max, s.y + s.height), 0) + 100, 400) * zoom}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                  transition: 'transform 0.2s ease-out',
                }}
              >
                {/* Grid background */}
                <defs>
                  <pattern
                    id="grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="#3a3a3a"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Slots */}
                {map.slots.map((slot) => (
                  <g key={slot.id}>
                    <rect
                      x={slot.x}
                      y={slot.y}
                      width={slot.width}
                      height={slot.height}
                      fill={getSlotColor(slot.status)}
                      fillOpacity="0.7"
                      stroke={getSlotColor(slot.status)}
                      strokeWidth="2"
                      rx="4"
                      style={{
                        cursor: 'pointer',
                        filter:
                          selectedSlot === slot.id
                            ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))'
                            : 'none',
                      }}
                      onClick={() => setSelectedSlot(selectedSlot === slot.id ? null : slot.id)}
                    />
                    <text
                      x={slot.x + slot.width / 2}
                      y={slot.y + slot.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="12"
                      fontWeight="bold"
                      fill="white"
                      style={{
                        cursor: 'pointer',
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

            {/* Selected Slot Info */}
            {selectedSlot && (
              <div className="mt-6 p-4 bg-secondary rounded-lg border border-border">
                <div className="space-y-3">
                  {map.slots
                    .filter((s) => s.id === selectedSlot)
                    .map((slot) => (
                      <div key={slot.id}>
                        <h3 className="text-lg font-semibold text-foreground mb-3">
                          {slot.slotNumber}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Status</p>
                            <Badge
                              className={`${
                                slot.status === 'available'
                                  ? 'bg-green-500/10 text-green-400 border-green-400/20'
                                  : slot.status === 'occupied'
                                    ? 'bg-red-500/10 text-red-400 border-red-400/20'
                                    : slot.status === 'reserved'
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-400/20'
                                      : 'bg-gray-500/10 text-gray-400 border-gray-400/20'
                              } border text-xs font-medium`}
                            >
                              {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Vehicle Type
                            </p>
                            <p className="text-sm font-medium text-foreground capitalize">
                              {slot.vehicleType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Position</p>
                            <p className="text-sm font-mono text-muted-foreground">
                              ({slot.x}, {slot.y})
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Dimensions</p>
                            <p className="text-sm font-mono text-muted-foreground">
                              {slot.width}x{slot.height}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">
              Status Legend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { status: 'available', label: 'Available', color: 'bg-green-500' },
                { status: 'occupied', label: 'Occupied', color: 'bg-red-500' },
                { status: 'reserved', label: 'Reserved', color: 'bg-blue-500' },
                { status: 'maintenance', label: 'Maintenance', color: 'bg-gray-500' },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded ${item.color}`} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
