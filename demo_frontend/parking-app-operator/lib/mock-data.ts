import {
  ParkingSlot,
  Reservation,
  AuditLog,
  DashboardMetrics,
  ParkingMap,
} from './types';

// Generate mock parking slots
export const generateMockSlots = (count: number = 24): ParkingSlot[] => {
  const slots: ParkingSlot[] = [];
  const cols = 6;
  const rows = Math.ceil(count / cols);
  const slotWidth = 60;
  const slotHeight = 100;
  const spacing = 20;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    slots.push({
      id: `slot-${i + 1}`,
      slotNumber: `A${String(i + 1).padStart(2, '0')}`,
      status: Math.random() > 0.5 ? 'occupied' : 'available',
      x: col * (slotWidth + spacing),
      y: row * (slotHeight + spacing),
      width: slotWidth,
      height: slotHeight,
      rotation: 0,
      vehicleType: 'standard',
    });
  }
  return slots;
};

// Mock reservations
export const mockReservations: Reservation[] = [
  {
    id: '1',
    reservationId: 'RES-2024-001',
    vehicleNumber: 'ABC-1234',
    driverName: 'John Smith',
    slotId: 'slot-1',
    slotNumber: 'A01',
    checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    checkOutTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
    duration: 180,
    status: 'active',
    amount: 2500,
    paymentStatus: 'completed',
  },
  {
    id: '2',
    reservationId: 'RES-2024-002',
    vehicleNumber: 'XYZ-5678',
    driverName: 'Sarah Johnson',
    slotId: 'slot-2',
    slotNumber: 'A02',
    checkInTime: new Date(Date.now() - 45 * 60 * 1000),
    checkOutTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    duration: 240,
    status: 'active',
    amount: 3200,
    paymentStatus: 'completed',
  },
  {
    id: '3',
    reservationId: 'RES-2024-003',
    vehicleNumber: 'LMN-9012',
    driverName: 'Mike Davis',
    slotId: 'slot-3',
    slotNumber: 'A03',
    checkInTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
    checkOutTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    duration: 120,
    status: 'completed',
    amount: 1800,
    paymentStatus: 'completed',
  },
  {
    id: '4',
    reservationId: 'RES-2024-004',
    vehicleNumber: 'PQR-3456',
    driverName: 'Emma Wilson',
    slotId: 'slot-4',
    slotNumber: 'A04',
    checkInTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    checkOutTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    duration: 60,
    status: 'no-show',
    amount: 0,
    paymentStatus: 'pending',
  },
];

// Mock audit logs
export const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    action: 'SLOT_STATUS_CHANGED',
    operator: 'John Operator',
    slotId: 'slot-5',
    slotNumber: 'A05',
    details: 'Slot status changed from available to occupied',
    status: 'success',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    action: 'RESERVATION_CREATED',
    operator: 'Sarah Operator',
    details: 'New reservation created for vehicle ABC-1234',
    status: 'success',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    action: 'CHECKOUT_COMPLETED',
    operator: 'Mike Admin',
    slotId: 'slot-3',
    slotNumber: 'A03',
    details: 'Checkout completed, payment received',
    status: 'success',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    action: 'DATA_MISMATCH_DETECTED',
    operator: 'System',
    details: 'Vehicle checkout time mismatch detected',
    status: 'failure',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    action: 'MAINTENANCE_MODE',
    operator: 'Admin User',
    slotId: 'slot-8',
    slotNumber: 'A08',
    details: 'Slot set to maintenance mode',
    status: 'success',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
    action: 'OPERATOR_LOGIN',
    operator: 'John Operator',
    details: 'User logged in from IP 192.168.1.100',
    status: 'success',
  },
];

// Mock dashboard metrics
export const mockMetrics: DashboardMetrics = {
  activeReservations: 8,
  occupiedSlots: 14,
  completedSessions: 42,
  noShows: 2,
  dataMismatches: 1,
  totalRevenue: 24500,
  occupancyRate: 58.3,
  averageSessionDuration: 145,
};

// Mock parking maps
export const mockParkingMap: ParkingMap = {
  id: 'map-1',
  name: 'Main Parking Lot',
  totalSlots: 24,
  slots: generateMockSlots(24),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
};

// Additional mock maps for the map builder
export const mockParkingMaps: ParkingMap[] = [
  mockParkingMap,
  {
    id: 'map-2',
    name: 'Level 2 - East Wing',
    totalSlots: 18,
    slots: generateMockSlots(18),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
];
