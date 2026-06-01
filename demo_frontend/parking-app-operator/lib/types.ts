export interface ParkingSlot {
  id: string;
  slotNumber: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  vehicleType?: 'standard' | 'compact' | 'handicap';
}

export interface Reservation {
  id: string;
  reservationId: string;
  vehicleNumber: string;
  driverName: string;
  slotId: string;
  slotNumber: string;
  checkInTime: Date;
  checkOutTime: Date;
  duration: number; // in minutes
  status: 'active' | 'completed' | 'no-show';
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  operator: string;
  slotId?: string;
  slotNumber?: string;
  details: string;
  status: 'success' | 'failure';
}

export interface DashboardMetrics {
  activeReservations: number;
  occupiedSlots: number;
  completedSessions: number;
  noShows: number;
  dataMismatches: number;
  totalRevenue: number;
  occupancyRate: number;
  averageSessionDuration: number;
}

export interface ParkingMap {
  id: string;
  name: string;
  totalSlots: number;
  slots: ParkingSlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: 'operator' | 'admin' | 'viewer';
  lastLogin: Date;
}
