import type { ParkingLotDefinition } from './parkingMap';
import type { ParkingPricingConfig } from '../../../packages/shared/src/parkingPricing';

export interface OperatorLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

export type TimestampValue = string;

export type HealthState = 'healthy' | 'degraded' | 'offline' | 'unknown';

export interface OperatorSystemHealth {
  overall: HealthState;
  database: HealthState;
  realtime: HealthState;
  syncMode: 'realtime' | 'polling';
  backendReachable: boolean;
  lastSuccessfulSyncAt: TimestampValue | null;
  lastDashboardRefreshAt: TimestampValue | null;
  lastRealtimeEventAt: TimestampValue | null;
  failedActionCount: number;
}

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
  linkedSessionId: string | null;
}

export interface ParkingSessionRecord {
  id: string;
  sessionId: string;
  reservationId: string | null;
  slotId: string;
  slotNumber: string;
  startedAt: TimestampValue;
  endedAt: TimestampValue | null;
  billedMinutes: number;
  status: 'active' | 'completed' | 'cancelled' | 'expired' | 'pending';
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface PaymentRecord {
  id: string;
  paymentId: string;
  reservationId: string | null;
  sessionId: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  createdAt: TimestampValue;
  paidAt: TimestampValue | null;
}

export interface AuditLog {
  id: string;
  timestamp: TimestampValue;
  action: string;
  operator: string;
  tableName?: string;
  slotId?: string;
  slotNumber?: string;
  reservationId?: string;
  sessionId?: string;
  paymentId?: string;
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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
  locationPricing: ParkingPricingConfig | null;
  parkingMap: ParkingMap;
  reservations: Reservation[];
  sessions: ParkingSessionRecord[];
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
  metrics: DashboardMetrics;
  reconciliationRuns: ReconciliationRun[];
  systemHealth: OperatorSystemHealth;
}

export interface ReservationListResponse {
  items: Reservation[];
  pagination: PaginationMeta;
  statusCounts: Record<Reservation['status'], number>;
}

export interface AuditListResponse {
  items: AuditLog[];
  pagination: PaginationMeta;
  uniqueActions: string[];
  stats: {
    success: number;
    failure: number;
  };
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: 'operator' | 'admin' | 'support' | 'finance';
  lastLogin: string | Date;
}
