'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockReservations } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export function RecentReservations() {
  const activeReservations = mockReservations.filter((r) => r.status === 'active');

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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Active Reservations ({activeReservations.length})
        </CardTitle>
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
              </tr>
            </thead>
            <tbody>
              {activeReservations.map((res) => (
                <tr
                  key={res.id}
                  className="border-b border-border hover:bg-secondary/50 transition-colors"
                >
                  <td className="py-3 px-4 text-foreground font-mono">{res.reservationId}</td>
                  <td className="py-3 px-4 text-foreground">{res.driverName}</td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">
                    {res.vehicleNumber}
                  </td>
                  <td className="py-3 px-4 text-foreground font-medium">{res.slotNumber}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDistanceToNow(res.checkInTime, { addSuffix: true })}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeReservations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No active reservations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
