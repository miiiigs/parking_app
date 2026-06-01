'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockParkingMap } from '@/lib/mock-data';
import { ParkingSlot } from '@/lib/types';
import {
  AlertCircle,
  CheckCircle,
  ParkingCircle,
  Wrench,
  Filter,
} from 'lucide-react';

export default function SlotBoardPage() {
  const [slots, setSlots] = useState<ParkingSlot[]>(mockParkingMap.slots);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const handleSlotStatusChange = (slotId: string, newStatus: ParkingSlot['status']) => {
    setSlots(
      slots.map((slot) =>
        slot.id === slotId ? { ...slot, status: newStatus } : slot
      )
    );
  };

  const filteredSlots = filterStatus
    ? slots.filter((slot) => slot.status === filterStatus)
    : slots;

  const stats = {
    available: slots.filter((s) => s.status === 'available').length,
    occupied: slots.filter((s) => s.status === 'occupied').length,
    reserved: slots.filter((s) => s.status === 'reserved').length,
    maintenance: slots.filter((s) => s.status === 'maintenance').length,
  };

  const getSlotColor = (status: ParkingSlot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'occupied':
        return 'bg-red-500 hover:bg-red-600';
      case 'reserved':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'maintenance':
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusIcon = (status: ParkingSlot['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4" />;
      case 'occupied':
        return <ParkingCircle className="w-4 h-4" />;
      case 'reserved':
        return <AlertCircle className="w-4 h-4" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Slot Board</h1>
          <p className="text-muted-foreground mt-2">
            View and manage parking slot statuses in real-time
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Available',
              count: stats.available,
              color: 'bg-green-500/10 text-green-400',
            },
            {
              label: 'Occupied',
              count: stats.occupied,
              color: 'bg-red-500/10 text-red-400',
            },
            {
              label: 'Reserved',
              count: stats.reserved,
              color: 'bg-blue-500/10 text-blue-400',
            },
            {
              label: 'Maintenance',
              count: stats.maintenance,
              color: 'bg-gray-500/10 text-gray-400',
            },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className={`p-3 rounded-lg ${stat.color} mb-3`}>
                  {stat.count}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Slot Grid */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Parking Lot A - Main Level
              </CardTitle>
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  size="sm"
                  onClick={() => setFilterStatus(null)}
                  variant={filterStatus === null ? 'default' : 'outline'}
                  className={filterStatus === null ? 'bg-primary text-primary-foreground' : 'border-border'}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFilterStatus('available')}
                  variant={filterStatus === 'available' ? 'default' : 'outline'}
                  className={filterStatus === 'available' ? 'bg-green-500 text-white' : 'border-border'}
                >
                  Available
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFilterStatus('occupied')}
                  variant={filterStatus === 'occupied' ? 'default' : 'outline'}
                  className={filterStatus === 'occupied' ? 'bg-red-500 text-white' : 'border-border'}
                >
                  Occupied
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFilterStatus('maintenance')}
                  variant={filterStatus === 'maintenance' ? 'default' : 'outline'}
                  className={filterStatus === 'maintenance' ? 'bg-gray-500 text-white' : 'border-border'}
                >
                  Maintenance
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {filteredSlots.map((slot) => (
                <div key={slot.id} className="space-y-2">
                  <button
                    onClick={() => setSelectedSlot(selectedSlot === slot.id ? null : slot.id)}
                    className={`w-full aspect-square rounded-lg transition-all border-2 flex items-center justify-center text-white font-bold ${getSlotColor(
                      slot.status
                    )} ${selectedSlot === slot.id ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent'}`}
                  >
                    {slot.slotNumber}
                  </button>

                  {/* Slot Details Panel */}
                  {selectedSlot === slot.id && (
                    <Card className="bg-secondary border-border col-span-full">
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Slot Number
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {slot.slotNumber}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Current Status
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-foreground capitalize">
                                {slot.status}
                              </div>
                              <div className={`${getSlotColor(slot.status)} p-1 rounded`}>
                                {getStatusIcon(slot.status)}
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground mb-3">
                              Change Status
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {(['available', 'occupied', 'reserved', 'maintenance'] as const).map(
                                (status) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    onClick={() => {
                                      handleSlotStatusChange(slot.id, status);
                                      setSelectedSlot(null);
                                    }}
                                    variant={
                                      slot.status === status ? 'default' : 'outline'
                                    }
                                    className={`text-xs ${
                                      slot.status === status
                                        ? getSlotColor(status).replace('hover:', '')
                                        : 'border-border'
                                    }`}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
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
                  <div className={`w-4 h-4 rounded ${item.color}`} />
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
