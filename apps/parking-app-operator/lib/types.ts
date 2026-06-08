import type { ParkingLotDefinition } from './parkingMap';

export interface OperatorLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

export type TimestampValue = string;

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
  checkInTime: TimestampValue | null;
  checkOutTime: TimestampValue | null;
  duration: number; // in minutes
  status: 'active' | 'completed' | 'no-show';
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
}

export interface AuditLog {
  id: string;
  timestamp: TimestampValue;
  action: string;
  operator: string;
  slotId?: string;
  slotNumber?: string;
  details: string;
  status: 'success' | 'failure';
}

export interface ReconciliationRun {
  id: string;
  runStatus: 'running' | 'completed' | 'failed';
  mismatchCount: number;
  fixedCount: number;
  message: string | null;
  startedAt: TimestampValue;
  completedAt: TimestampValue | null;
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
  layout?: ParkingLotDefinition | null;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
}

export interface OperatorDashboardData {
  location: OperatorLocation | null;
  parkingMap: ParkingMap;
  reservations: Reservation[];
  auditLogs: AuditLog[];
  metrics: DashboardMetrics;
  reconciliationRuns: ReconciliationRun[];
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: 'operator' | 'admin' | 'support' | 'finance';
  lastLogin: string | Date;
}
