'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockReservations } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { Search, Filter } from 'lucide-react';

export default function ReservationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredReservations = mockReservations.filter((res) => {
    const matchesSearch =
      res.reservationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.driverName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || res.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'completed':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      case 'no-show':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'pending':
        return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      case 'failed':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      default:
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Reservations</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all parking reservations in real-time
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reservation ID, vehicle, or driver..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setStatusFilter(null)}
                  variant={statusFilter === null ? 'default' : 'outline'}
                  size="sm"
                  className={statusFilter === null ? 'bg-primary text-primary-foreground' : 'border-border'}
                >
                  All
                </Button>
                <Button
                  onClick={() => setStatusFilter('active')}
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  className={statusFilter === 'active' ? 'bg-primary text-primary-foreground' : 'border-border'}
                >
                  Active
                </Button>
                <Button
                  onClick={() => setStatusFilter('completed')}
                  variant={statusFilter === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  className={statusFilter === 'completed' ? 'bg-primary text-primary-foreground' : 'border-border'}
                >
                  Completed
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Res. ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Driver
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Vehicle
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Slot
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Check-in
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Check-out
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Duration
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Payment
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((res) => (
                    <tr
                      key={res.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground font-mono text-xs">
                        {res.reservationId}
                      </td>
                      <td className="py-3 px-4 text-foreground">{res.driverName}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground text-xs">
                        {res.vehicleNumber}
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">{res.slotNumber}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {res.checkInTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {res.checkOutTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-foreground">{res.duration} min</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`${getStatusColor(
                            res.status
                          )} border text-xs font-medium`}
                        >
                          {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`${getPaymentColor(
                            res.paymentStatus
                          )} border text-xs font-medium`}
                        >
                          {res.paymentStatus.charAt(0).toUpperCase() +
                            res.paymentStatus.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">
                        ₹{res.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border text-xs"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredReservations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No reservations found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
